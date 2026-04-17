import { useEffect, useState } from 'react';
import { api } from './api.js';

const fmt = (n) => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—';
const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '—';

const RANGO_COLORS = {
  exacto:   { bg: '#dcfce7', color: '#166534', icon: '✓' },
  leve_pos: { bg: '#fef9c3', color: '#854d0e', icon: '↑' },
  mod_pos:  { bg: '#fed7aa', color: '#7c2d12', icon: '↑↑' },
  alto_pos: { bg: '#fee2e2', color: '#991b1b', icon: '⚠' },
  leve_neg: { bg: '#fef9c3', color: '#854d0e', icon: '↓' },
  mod_neg:  { bg: '#e0f2fe', color: '#075985', icon: '↓↓' },
  alto_neg: { bg: '#ede9fe', color: '#4c1d95', icon: '⚠' },
};

function KpiMini({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function TarifasAplicadas() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/tarifas-aplicadas')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="message">Analizando tarifas aplicadas…</div>;
  if (error)   return <div className="message">{error}</div>;

  const { totalReservas, analizados, sinTarifa, rangos, porRuta, porTipo } = data;

  const conDif     = rangos.filter(r => r.id !== 'exacto').reduce((s, r) => s + r.cantidad, 0);
  const exactos    = rangos.find(r => r.id === 'exacto')?.cantidad ?? 0;
  const montoExtra = porRuta.reduce((s, r) => s + r.montoExtra, 0);
  const rangosPos  = rangos.filter(r => r.id.endsWith('pos'));
  const rangosNeg  = rangos.filter(r => r.id.endsWith('neg'));

  return (
    <div>
      <h2 className="section-title">Tarifas aplicadas vs. tarifas legales</h2>
      <p className="section-sub">
        Compara el monto cobrado por equipo (totalRackEquipo) contra la tarifa vigente del período.
        Solo reservas Facturadas y Pagadas con tarifa identificable.
      </p>

      <div className="kpi-grid">
        <KpiMini label="Total analizadas" value={analizados.toLocaleString('es-CL')}  color="#4338ca" sub={`de ${totalReservas.toLocaleString('es-CL')} facturas`} />
        <KpiMini label="Tarifa correcta"  value={exactos.toLocaleString('es-CL')}     color="#10b981" sub={pct(exactos, analizados)} />
        <KpiMini label="Con diferencia"   value={conDif.toLocaleString('es-CL')}      color="#ef4444" sub={pct(conDif, analizados)} />
        <KpiMini label="Sin tarifa ref."  value={sinTarifa.toLocaleString('es-CL')}   color="#94a3b8" sub="no clasificable" />
        <KpiMini
          label="Diferencia neta"
          value={fmt(montoExtra)}
          color={montoExtra < 0 ? '#8b5cf6' : '#f59e0b'}
          sub={montoExtra < 0 ? 'cobrado de menos' : 'cobrado de más'}
        />
      </div>

      {/* Tabla de rangos */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h3>Distribución de diferencias por rango</h3>
        <table className="regla-table ta-table">
          <thead>
            <tr>
              <th>Rango</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
              <th style={{ textAlign: 'right' }}>% del analizado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr className="ta-separator"><td colSpan="4">Tarifa correctamente aplicada</td></tr>
            {rangos.filter(r => r.id === 'exacto').map(r => {
              const cfg = RANGO_COLORS[r.id];
              return (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.cantidad.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right' }}>{pct(r.cantidad, analizados)}</td>
                  <td><span className="ta-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon} OK</span></td>
                </tr>
              );
            })}

            <tr className="ta-separator"><td colSpan="4">Cobrado por encima de tarifa (posible sobrecobro)</td></tr>
            {rangosPos.map(r => {
              const cfg = RANGO_COLORS[r.id];
              return (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.cantidad.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right' }}>{pct(r.cantidad, analizados)}</td>
                  <td><span className="ta-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</span></td>
                </tr>
              );
            })}

            <tr className="ta-separator"><td colSpan="4">Cobrado por debajo de tarifa (posible subcobro)</td></tr>
            {rangosNeg.map(r => {
              const cfg = RANGO_COLORS[r.id];
              return (
                <tr key={r.id}>
                  <td>{r.label}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.cantidad.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right' }}>{pct(r.cantidad, analizados)}</td>
                  <td><span className="ta-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon}</span></td>
                </tr>
              );
            })}

            <tr className="ta-separator"><td colSpan="4">Sin tarifa de referencia encontrada</td></tr>
            <tr>
              <td>Tipo equipo o ruta no clasificable</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{sinTarifa.toLocaleString('es-CL')}</td>
              <td style={{ textAlign: 'right' }}>{pct(sinTarifa, totalReservas)}</td>
              <td><span className="ta-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>—</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="dash-grid">
        {/* Por ruta */}
        <div className="dash-card">
          <h3>Diferencias por ruta</h3>
          <table className="regla-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th style={{ textAlign: 'right' }}>Analizadas</th>
                <th style={{ textAlign: 'right' }}>Con diferencia</th>
                <th style={{ textAlign: 'right' }}>Diferencia neta</th>
              </tr>
            </thead>
            <tbody>
              {porRuta.map(r => (
                <tr key={r.ruta}>
                  <td><strong>{r.ruta}</strong></td>
                  <td style={{ textAlign: 'right' }}>{r.analizados.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right', color: r.diferencias > 0 ? '#dc2626' : '#16a34a' }}>
                    {r.diferencias.toLocaleString('es-CL')} ({pct(r.diferencias, r.analizados)})
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: r.montoExtra < 0 ? '#7c3aed' : '#059669' }}>
                    {fmt(r.montoExtra)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Por tipo equipo */}
        <div className="dash-card">
          <h3>Diferencias por tipo de equipo</h3>
          <table className="regla-table">
            <thead>
              <tr>
                <th>Tipo equipo</th>
                <th style={{ textAlign: 'right' }}>Analizadas</th>
                <th style={{ textAlign: 'right' }}>Con diferencia</th>
                <th style={{ textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {porTipo.map(t => (
                <tr key={t.tipo}>
                  <td>{t.tipo}</td>
                  <td style={{ textAlign: 'right' }}>{t.analizados.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right', color: t.diferencias > 0 ? '#dc2626' : '#16a34a' }}>
                    {t.diferencias.toLocaleString('es-CL')}
                  </td>
                  <td style={{ textAlign: 'right' }}>{pct(t.diferencias, t.analizados)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="regla-footer">
        Metodología: se compara totalRackEquipo de cada reserva contra tarifa vigente según período (fechaZarpe),
        ruta, tipo de equipo y tramo MLI. Tolerancia ±1% para redondeos. Solo Facturadas y Pagadas.
      </div>
    </div>
  );
}

export default TarifasAplicadas;
