import { useEffect, useState } from 'react';
import { api } from './api.js';

const pct  = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '—';

function KpiMini({ label, value, sub, color }) {
  return (
    <div className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function BarraPorc({ valor, max, color }) {
  const w = max ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 4, height: 8, overflow: 'hidden', minWidth: 80 }}>
      <div style={{ width: `${w}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

function AnalisisDescuentos() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [paginaTabla, setPaginaTabla] = useState(0);
  const POR_PAG = 10;

  useEffect(() => {
    api.get('/analisis-descuentos')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="message">Analizando descuentos por volumen… puede tardar unos segundos.</div>;
  if (error)   return <div className="message">{error}</div>;

  const { totalClienteMes, correcto, incorrecto, rangoConsistencia, casosIncorrectos, tierResumen, tierStats } = data;

  const totalTransiciones = correcto + incorrecto;
  const consistenciaOk   = rangoConsistencia.find(r => r.id === 'ok')?.cantidad ?? 0;
  const totalInconsist   = rangoConsistencia.filter(r => r.id !== 'ok').reduce((s, r) => s + r.cantidad, 0);
  const maxTierCount     = Math.max(...tierResumen.map(t => t.count));

  const pagInicio = paginaTabla * POR_PAG;
  const casosPag  = casosIncorrectos.slice(pagInicio, pagInicio + POR_PAG);
  const totalPags = Math.ceil(casosIncorrectos.length / POR_PAG);

  return (
    <div>
      <h2 className="section-title">Análisis de descuentos por volumen</h2>
      <p className="section-sub">
        Verifica si los descuentos aplicados en el mes M son coherentes con el volumen de embarques
        del mes M-1. Criterio: a mayor volumen en el mes anterior, igual o mayor descuento en el actual.
      </p>

      {/* KPIs */}
      <div className="kpi-grid">
        <KpiMini label="Períodos cliente-mes" value={totalClienteMes.toLocaleString('es-CL')} color="#4338ca" sub="combinaciones analizadas" />
        <KpiMini label="Tasa uniforme en mes" value={consistenciaOk.toLocaleString('es-CL')}  color="#10b981" sub={pct(consistenciaOk, totalClienteMes)} />
        <KpiMini label="Variación interna"    value={totalInconsist.toLocaleString('es-CL')}  color="#f59e0b" sub="distintas tasas en mismo mes" />
        <KpiMini label="Transiciones correctas"  value={correcto.toLocaleString('es-CL')}     color="#0ea5e9" sub={pct(correcto, totalTransiciones)} />
        <KpiMini label="Transiciones anómalas"   value={incorrecto.toLocaleString('es-CL')}   color="#ef4444" sub={pct(incorrecto, totalTransiciones)} />
      </div>

      <div className="dash-grid">
        {/* Consistencia interna */}
        <div className="dash-card">
          <h3>Consistencia de tasa dentro del mes</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px' }}>
            Un cliente debería tener el mismo % de descuento en todas sus reservas del mismo mes.
          </p>
          <table className="regla-table">
            <thead>
              <tr>
                <th>Resultado</th>
                <th style={{ textAlign: 'right' }}>Períodos</th>
                <th style={{ textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {rangoConsistencia.map(r => {
                const color = r.id === 'ok' ? '#16a34a' : r.id === 'leve' ? '#d97706' : '#dc2626';
                return (
                  <tr key={r.id}>
                    <td style={{ color, fontWeight: 600 }}>{r.label}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.cantidad.toLocaleString('es-CL')}</td>
                    <td style={{ textAlign: 'right' }}>{pct(r.cantidad, totalClienteMes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Correlación volumen → descuento */}
        <div className="dash-card">
          <h3>Correlación volumen M-1 → descuento M</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px' }}>
            Si el volumen del mes anterior cambia más del 20%, el descuento debería moverse en la misma dirección.
          </p>
          <table className="regla-table">
            <thead>
              <tr>
                <th>Tramo de volumen (mes anterior)</th>
                <th style={{ textAlign: 'right' }}>Transiciones</th>
                <th style={{ textAlign: 'right' }}>Correctas</th>
                <th style={{ textAlign: 'right' }}>Anómalas</th>
              </tr>
            </thead>
            <tbody>
              {tierStats.map(t => (
                <tr key={t.tier}>
                  <td>
                    <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:t.color, marginRight:6 }} />
                    {t.label}
                  </td>
                  <td style={{ textAlign: 'right' }}>{t.totalTransiciones.toLocaleString('es-CL')}</td>
                  <td style={{ textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{t.correcto}</td>
                  <td style={{ textAlign: 'right', color: t.incorrecto > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{t.incorrecto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Descuento promedio por tier */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h3>Descuento promedio aplicado por tramo de volumen mensual</h3>
        <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 16px' }}>
          A mayor volumen (equipos embarcados en el mes), mayor debería ser el descuento promedio obtenido.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tierResumen.map(t => (
            <div key={t.tier} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px 80px', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '0.83rem', color: '#374151' }}>
                <span style={{ display:'inline-block', width:10, height:10, borderRadius:'50%', background:t.color, marginRight:6 }} />
                {t.label}
              </div>
              <BarraPorc valor={t.pctDescPromedio} max={25} color={t.color} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', textAlign: 'right' }}>{t.pctDescPromedio}%</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>{t.count} períodos</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de casos anómalos */}
      {casosIncorrectos.length > 0 && (
        <div className="dash-card" style={{ marginBottom: 20 }}>
          <h3>Casos con correlación anómala volumen → descuento</h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 14px' }}>
            Clientes donde el descuento se movió en dirección contraria al volumen del mes anterior.
          </p>
          <table className="regla-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th style={{ textAlign: 'right' }}>Mes</th>
                <th style={{ textAlign: 'right' }}>Equipos M-1</th>
                <th style={{ textAlign: 'right' }}>Equipos M</th>
                <th style={{ textAlign: 'right' }}>Desc. M-1</th>
                <th style={{ textAlign: 'right' }}>Desc. M</th>
                <th>Anomalía</th>
              </tr>
            </thead>
            <tbody>
              {casosPag.map((c, i) => (
                <tr key={i}>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.cliente}</td>
                  <td style={{ textAlign: 'right' }}>{c.mes}</td>
                  <td style={{ textAlign: 'right' }}>{c.equiposAnterior}</td>
                  <td style={{ textAlign: 'right' }}>{c.equiposActual}</td>
                  <td style={{ textAlign: 'right' }}>{c.descAnterior}%</td>
                  <td style={{ textAlign: 'right', color: c.descActual < c.descAnterior ? '#dc2626' : '#d97706', fontWeight: 600 }}>{c.descActual}%</td>
                  <td style={{ fontSize: '0.78rem', color: '#7c3aed' }}>{c.motivo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPags > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12, fontSize: '0.85rem' }}>
              <button className="btn-logout" onClick={() => setPaginaTabla(p => Math.max(0, p - 1))} disabled={paginaTabla === 0}>← Anterior</button>
              <span style={{ alignSelf: 'center', color: '#64748b' }}>Pág. {paginaTabla + 1} / {totalPags}</span>
              <button className="btn-logout" onClick={() => setPaginaTabla(p => Math.min(totalPags - 1, p + 1))} disabled={paginaTabla === totalPags - 1}>Siguiente →</button>
            </div>
          )}
        </div>
      )}

      <div className="regla-nota" style={{ marginBottom: 8 }}>
        📌 La tabla de tramos de descuento por volumen está definida internamente. El análisis verifica la
        coherencia direccional: si el volumen del mes M-1 sube o baja más del 20%, el descuento del mes M
        debería moverse en la misma dirección.
      </div>
      <div className="regla-footer">
        Fuente: reservas Facturadas y Pagadas oct 2024 – dic 2025 · {totalClienteMes.toLocaleString('es-CL')} períodos cliente-mes analizados.
      </div>
    </div>
  );
}

export default AnalisisDescuentos;
