import { useEffect, useState } from 'react';
import { api } from './api.js';

const fmt  = (n) => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—';
const pct  = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '—';

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function ScoreBadge({ score, umbral }) {
  const color = score >= umbral ? '#16a34a' : score >= umbral - 10 ? '#d97706' : '#dc2626';
  return (
    <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:12, background: color, color:'#fff', fontWeight:700, fontSize:'0.82rem' }}>
      {score}%
    </span>
  );
}

function MiniBar({ value, max, color }) {
  const w = max ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
    </div>
  );
}

function Kpis() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/informe')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis de KPIs.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="message">Calculando KPIs… puede tardar unos segundos.</div>;
  if (error)   return <div className="message">{error}</div>;

  const { kpiBase, tarifas, cargaPeligrosa, sobreancho, descuentos, operacional, scores, scoreGlobal } = data;

  const tasaAnulacion = kpiBase.total > 0 ? (kpiBase.anuladas / kpiBase.total * 100).toFixed(1) : 0;
  const tasaFacturacion = kpiBase.total > 0 ? ((kpiBase.facturadas + kpiBase.pagadas) / kpiBase.total * 100).toFixed(1) : 0;
  const pctDescGlobal = kpiBase.montoRack > 0 ? (kpiBase.montoDesc / kpiBase.montoRack * 100).toFixed(1) : 0;
  const pctRecGlobal  = kpiBase.montoRack > 0 ? (kpiBase.montoRecargos / kpiBase.montoRack * 100).toFixed(1) : 0;
  const maxMes = Math.max(...(operacional.porMes.map(m => m.monto) || [1]));

  return (
    <div>
      <h2 className="section-title">Panel de KPIs</h2>
      <p className="section-sub">
        Indicadores clave de desempeño operacional, tarifario y de cumplimiento normativo.
        Fuente: reservas Facturadas y Pagadas oct 2024 – dic 2025.
      </p>

      {/* Score global */}
      <div className="dash-card" style={{ marginBottom: 20, borderTop: '4px solid #4338ca' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 4 }}>Cumplimiento normativo global</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: scoreGlobal >= 80 ? '#16a34a' : scoreGlobal >= 65 ? '#d97706' : '#dc2626' }}>{scoreGlobal}%</div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(scores).map(([k, v]) => {
              const labels = { tarifas: 'Tarifas aplicadas', cargaPeligrosa: 'Recargo carga peligrosa', sobreancho: 'Recargo sobreancho', descuentos: 'Coherencia descuentos' };
              return (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 60px', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>{labels[k]}</span>
                  <MiniBar value={v.score} max={100} color={v.cumple ? '#16a34a' : '#dc2626'} />
                  <ScoreBadge score={v.score} umbral={v.umbral} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPIs operacionales */}
      <h3 style={{ color: '#1e293b', margin: '0 0 12px' }}>KPIs Operacionales</h3>
      <div className="kpi-grid">
        <KpiCard label="Total reservas"       value={kpiBase.total.toLocaleString('es-CL')}     color="#4338ca" sub="en el período analizado" />
        <KpiCard label="Tasa facturación"     value={`${tasaFacturacion}%`}                      color="#10b981" sub={`${(kpiBase.facturadas+kpiBase.pagadas).toLocaleString('es-CL')} facturadas/pagadas`} />
        <KpiCard label="Tasa anulación"       value={`${tasaAnulacion}%`}                        color="#f59e0b" sub={`${kpiBase.anuladas.toLocaleString('es-CL')} reservas anuladas`} />
        <KpiCard label="Monto rack total"     value={fmt(kpiBase.montoRack)}                     color="#0ea5e9" sub="tarifa base sin ajustes" />
        <KpiCard label="Descuento promedio"   value={`${pctDescGlobal}%`}                        color="#8b5cf6" sub={`${fmt(kpiBase.montoDesc)} en descuentos`} />
        <KpiCard label="Recargo promedio"     value={`${pctRecGlobal}%`}                         color="#ec4899" sub={`${fmt(kpiBase.montoRecargos)} en recargos`} />
      </div>

      {/* KPIs tarifarios */}
      <h3 style={{ color: '#1e293b', margin: '16px 0 12px' }}>KPIs Tarifarios</h3>
      <div className="kpi-grid">
        <KpiCard label="Exactitud tarifas"    value={`${tarifas.score}%`}                        color={tarifas.score >= 90 ? '#16a34a' : '#dc2626'} sub={`${tarifas.ok.toLocaleString('es-CL')} de ${tarifas.matcheadas.toLocaleString('es-CL')} matcheadas`} />
        <KpiCard label="Subcobro estimado"    value={fmt(tarifas.montoSubcobro)}                 color="#7c3aed" sub={`${tarifas.difNeg.toLocaleString('es-CL')} registros`} />
        <KpiCard label="Sobrecobro estimado"  value={fmt(tarifas.montoSobrecobro)}               color="#f59e0b" sub={`${tarifas.difPos.toLocaleString('es-CL')} registros`} />
        <KpiCard label="Sin tarifa ref."      value={tarifas.sinTarifa.toLocaleString('es-CL')}  color="#94a3b8" sub="no matcheadas en tabla" />
      </div>

      {/* KPIs recargos y descuentos */}
      <h3 style={{ color: '#1e293b', margin: '16px 0 12px' }}>KPIs Recargos y Descuentos</h3>
      <div className="kpi-grid">
        <KpiCard label="C.Peligrosa sin recargo" value={cargaPeligrosa.sinRecargo.toLocaleString('es-CL')} color="#dc2626" sub={`${pct(cargaPeligrosa.sinRecargo, cargaPeligrosa.total)} del total`} />
        <KpiCard label="Monto no recargado CP"   value={fmt(cargaPeligrosa.montoNoAplicado)}              color="#ef4444" sub="estimado sobre tarifa rack" />
        <KpiCard label="Sobreancho sin recargo"  value={sobreancho.sinRecargo.toLocaleString('es-CL')}    color="#f97316" sub={`${pct(sobreancho.sinRecargo, sobreancho.total)} del total`} />
        <KpiCard label="Monto no recargado SA"   value={fmt(sobreancho.montoNoAplicado)}                  color="#f59e0b" sub="estimado sobre tarifa rack" />
        <KpiCard label="Desc. inconsistentes"    value={descuentos.varAlta.toLocaleString('es-CL')}       color="#d97706" sub="alta varianza intra-mes" />
        <KpiCard label="Transiciones anómalas"   value={descuentos.transMal.toLocaleString('es-CL')}      color="#dc2626" sub={`de ${descuentos.transTotal.toLocaleString('es-CL')} transiciones`} />
      </div>

      {/* Evolución mensual */}
      <div className="dash-card" style={{ marginTop: 20 }}>
        <h3>Evolución mensual de reservas (facturadas y pagadas)</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, overflowX: 'auto', paddingBottom: 4 }}>
          {operacional.porMes.map(m => {
            const h = maxMes > 0 ? Math.round((m.monto / maxMes) * 100) : 0;
            return (
              <div key={m.mes} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                <div title={fmt(m.monto)} style={{ width: 28, height: `${h}%`, background: '#4338ca', borderRadius: '3px 3px 0 0', minHeight: 4, cursor: 'default' }} />
                <span style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 3, transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{m.mes.slice(2)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top clientes */}
      <div className="dash-grid" style={{ marginTop: 16 }}>
        <div className="dash-card">
          <h3>Top 10 clientes por monto rack</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 10px' }}>
            Concentración top 3: {operacional.concentracionTop3pct}% del monto total.
          </p>
          <table className="regla-table">
            <thead><tr><th>Cliente</th><th style={{ textAlign:'right' }}>Reservas</th><th style={{ textAlign:'right' }}>Monto rack</th><th style={{ textAlign:'right' }}>%</th></tr></thead>
            <tbody>
              {operacional.topClientes.map((c, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente}</td>
                  <td style={{ textAlign: 'right' }}>{c.cnt.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(c.monto)}</td>
                  <td style={{ textAlign: 'right', color: '#4338ca', fontWeight: 600 }}>{c.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <h3>Distribución por ruta</h3>
          {operacional.porRuta.map(r => {
            const maxR = Math.max(...operacional.porRuta.map(x => x.monto));
            return (
              <div key={r.ruta} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: 3 }}>
                  <span style={{ fontWeight: 600 }}>{r.ruta}</span>
                  <span style={{ color: '#64748b' }}>{r.cnt.toLocaleString('es-CL')} reservas · {fmt(r.monto)}</span>
                </div>
                <MiniBar value={r.monto} max={maxR} color="#0ea5e9" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="regla-footer" style={{ marginTop: 16 }}>
        Fuente: reservas Facturadas y Pagadas oct 2024 – dic 2025 · {kpiBase.total.toLocaleString('es-CL')} reservas totales analizadas.
      </div>
    </div>
  );
}

export default Kpis;
