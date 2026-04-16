import { useEffect, useState } from 'react';
import { api } from './api.js';

const ESTADO_COLORS = {
  Facturada:  '#4338ca',
  Anulada:    '#ef4444',
  Tentativa:  '#f59e0b',
  Pagada:     '#10b981',
  Edicion:    '#8b5cf6',
};

const fmt = (n) =>
  n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '-';

const pct = (part, total) =>
  total ? Math.round((part / total) * 100) : 0;

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function BarChart({ data, colorFn, total }) {
  return (
    <div className="bar-list">
      {data.map((item) => {
        const p = pct(item.total, total);
        return (
          <div key={item._id} className="bar-row">
            <div className="bar-label">{item._id || '—'}</div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${p}%`, background: colorFn ? colorFn(item._id) : '#4338ca' }}
              />
            </div>
            <div className="bar-count">{item.total.toLocaleString('es-CL')} <span>({p}%)</span></div>
          </div>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="message">Cargando dashboard...</div>;
  if (!data) return <div className="message">Sin datos.</div>;

  const { total, porEstado, porRuta, porNave, porTipoEquipo, porMes, montos } = data;
  const porcentajeCobrado = pct(montos.montoPagado, montos.montoTotal);

  // ordenar meses cronológicamente mm-yyyy → yyyy-mm
  const mesesOrdenados = [...porMes]
    .filter(m => m._id && m._id.length === 7)
    .sort((a, b) => {
      const [ma, ya] = a._id.split('-');
      const [mb, yb] = b._id.split('-');
      return `${ya}-${ma}` > `${yb}-${mb}` ? 1 : -1;
    });
  const maxMes = Math.max(...mesesOrdenados.map(m => m.total));

  return (
    <div>
      <h2 className="section-title">Dashboard general</h2>
      <p className="section-sub">Período oct 2024 – dic 2025 · {total.toLocaleString('es-CL')} reservas totales</p>

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard label="Total reservas"   value={total.toLocaleString('es-CL')}       color="#4338ca" />
        <KpiCard label="Monto facturado"  value={fmt(montos.montoTotal)}               color="#10b981" sub="valor bruto de reservas" />
        <KpiCard label="Total cobrado"    value={fmt(montos.montoPagado)}              color="#0ea5e9" sub={`${porcentajeCobrado}% del total`} />
        <KpiCard label="Descuentos"       value={fmt(montos.montoDescuentos)}          color="#f59e0b" />
        <KpiCard label="Recargos"         value={fmt(montos.montoRecargos)}            color="#8b5cf6" />
        <KpiCard label="Facturadas"
          value={(porEstado.find(e => e._id === 'Facturada')?.total || 0).toLocaleString('es-CL')}
          color="#4338ca"
          sub={`${pct(porEstado.find(e => e._id === 'Facturada')?.total || 0, total)}% del total`}
        />
      </div>

      <div className="dash-grid">
        {/* Estados */}
        <div className="dash-card">
          <h3>Reservas por estado</h3>
          <BarChart
            data={porEstado}
            total={total}
            colorFn={(id) => ESTADO_COLORS[id] || '#94a3b8'}
          />
        </div>

        {/* Rutas */}
        <div className="dash-card">
          <h3>Top rutas</h3>
          <BarChart data={porRuta} total={total} />
        </div>

        {/* Naves */}
        <div className="dash-card">
          <h3>Naves</h3>
          <BarChart
            data={porNave}
            total={total}
            colorFn={(id) => id === 'DALKA' ? '#0ea5e9' : '#8b5cf6'}
          />
        </div>

        {/* Tipos de equipo */}
        <div className="dash-card">
          <h3>Tipos de equipo</h3>
          <BarChart data={porTipoEquipo} total={total} colorFn={() => '#10b981'} />
        </div>
      </div>

      {/* Tendencia mensual */}
      <div className="dash-card dash-card--full">
        <h3>Reservas por mes</h3>
        <div className="mes-chart">
          {mesesOrdenados.map((m) => (
            <div key={m._id} className="mes-col">
              <div className="mes-bar-wrap">
                <div
                  className="mes-bar"
                  style={{ height: `${pct(m.total, maxMes)}%` }}
                  title={m.total.toLocaleString('es-CL')}
                />
              </div>
              <div className="mes-label">{m._id}</div>
              <div className="mes-val">{m.total.toLocaleString('es-CL')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
