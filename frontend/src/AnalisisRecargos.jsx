import { useEffect, useState } from 'react';
import { api } from './api.js';

const fmt   = (n) => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—';
const pct   = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '—';
const diff  = (n) => {
  const v = Math.round(n);
  return v < 0
    ? { txt: fmt(v), color: '#7c3aed' }
    : { txt: `+${fmt(v)}`, color: '#dc2626' };
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

function SeccionRecargo({ titulo, regla, color, datos, tipo }) {
  const aplicado   = datos.conRecargo ?? 0;
  const sinRecargo = datos.sinRecargo ?? 0;
  const total      = datos.total ?? 0;
  const difMonto   = (datos.montoAplicado ?? 0) - (datos.montoEsperado ?? 0);
  const rangos     = datos.rangos ?? {};

  return (
    <div className="dash-card" style={{ borderTop: `4px solid ${color}`, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', color: '#1e293b' }}>{titulo}</h3>
          <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b' }}>{regla}</p>
        </div>
        <span style={{ fontSize: '1.8rem' }}>{tipo}</span>
      </div>

      {/* Barra visual */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: 4 }}>
          <span>Con recargo aplicado</span>
          <span>{pct(aplicado, total)} de {total.toLocaleString('es-CL')} registros</span>
        </div>
        <div style={{ background: '#f1f5f9', borderRadius: 6, height: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${total ? (aplicado / total) * 100 : 0}%`, background: color, borderRadius: 6, transition: 'width 0.5s' }} />
        </div>
      </div>

      <table className="regla-table" style={{ marginBottom: 12 }}>
        <thead>
          <tr>
            <th>Estado del recargo</th>
            <th style={{ textAlign: 'right' }}>Registros</th>
            <th style={{ textAlign: 'right' }}>% del total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ color: '#dc2626', fontWeight: 600 }}>Sin recargo (debería tenerlo)</td>
            <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{sinRecargo.toLocaleString('es-CL')}</td>
            <td style={{ textAlign: 'right' }}>{pct(sinRecargo, total)}</td>
          </tr>
          {Object.entries(rangos).map(([id, cantidad]) => {
            const labels = {
              correcto:  { txt: 'Recargo correcto (±10%)',  color: '#16a34a' },
              exceso:    { txt: 'Recargo en exceso (>10%)', color: '#f59e0b' },
              deficit_l: { txt: 'Recargo menor 10–50%',     color: '#0284c7' },
              deficit_a: { txt: 'Recargo menor >50%',       color: '#7c3aed' },
            };
            const cfg = labels[id] ?? { txt: id, color: '#64748b' };
            return (
              <tr key={id}>
                <td style={{ color: cfg.color }}>{cfg.txt}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{cantidad.toLocaleString('es-CL')}</td>
                <td style={{ textAlign: 'right' }}>{pct(cantidad, aplicado)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: 20, fontSize: '0.83rem', flexWrap: 'wrap' }}>
        <span><strong>Recargo esperado:</strong> {fmt(datos.montoEsperado)}</span>
        <span><strong>Recargo aplicado:</strong> {fmt(datos.montoAplicado)}</span>
        <span style={{ fontWeight: 700, color: diff(difMonto).color }}>
          Diferencia: {diff(difMonto).txt}
        </span>
      </div>
    </div>
  );
}

function AnalisisRecargos() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    api.get('/analisis-recargos')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el análisis.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="message">Analizando recargos aplicados… puede tardar unos segundos.</div>;
  if (error)   return <div className="message">{error}</div>;

  const { cargaPeligrosa, sobreancho, pesosExcedidos, resumen } = data;

  const TRAMO_INFO = [
    { id: 'sa_leve', label: 'Sobreancho 2.6 – 3.0 m', regla: 'Recargo obligatorio: 50% sobre tarifa base.', color: '#f59e0b' },
    { id: 'sa_mod',  label: 'Sobreancho 3.1 – 4.0 m', regla: 'Recargo obligatorio: 100% sobre tarifa base.', color: '#f97316' },
    { id: 'sa_alto', label: 'Sobreancho 4.1 m o más', regla: 'Recargo obligatorio: 200% sobre tarifa base.', color: '#ef4444' },
  ];

  return (
    <div>
      <h2 className="section-title">Análisis de recargos aplicados</h2>
      <p className="section-sub">
        Verifica si los recargos por carga peligrosa y sobreancho fueron correctamente aplicados
        en reservas Facturadas y Pagadas, según normativa vigente.
      </p>

      {/* KPIs resumen */}
      <div className="kpi-grid">
        <KpiMini
          label="Sin recargo (debe tenerlo)"
          value={resumen.totalSinRecargo.toLocaleString('es-CL')}
          color="#dc2626"
          sub="registros sin recargo obligatorio"
        />
        <KpiMini
          label="Monto no recargado"
          value={fmt(resumen.montoNoRecargado)}
          color="#7c3aed"
          sub="estimado en base a tarifa rack"
        />
        <KpiMini
          label="C. Peligrosa sin recargo"
          value={cargaPeligrosa.sinRecargo.toLocaleString('es-CL')}
          color="#ef4444"
          sub={pct(cargaPeligrosa.sinRecargo, cargaPeligrosa.total)}
        />
        <KpiMini
          label="Sobreancho sin recargo"
          value={sobreancho.reduce((s, t) => s + t.sinRecargo, 0).toLocaleString('es-CL')}
          color="#f59e0b"
          sub="total de los 3 tramos"
        />
      </div>

      {/* Carga peligrosa */}
      <SeccionRecargo
        titulo="Carga peligrosa (clases 2, 3, 4, 5, 8, 9)"
        regla="Recargo obligatorio: 20% sobre tarifa base por equipos con tipoCarga = CARGA PELIGROSA."
        color="#ef4444"
        tipo="⚠️"
        datos={cargaPeligrosa}
      />

      {/* Sobreancho */}
      {sobreancho.map((tramo, i) => {
        const info = TRAMO_INFO.find(t => t.id === tramo.id) ?? {};
        return (
          <SeccionRecargo
            key={tramo.id}
            titulo={info.label}
            regla={info.regla}
            color={info.color}
            tipo="↔️"
            datos={tramo}
          />
        );
      })}

      {/* Pesos excedidos */}
      <div className="dash-card" style={{ borderTop: '4px solid #0ea5e9', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', color: '#1e293b' }}>Pesos máximos permitidos</h3>
            <p style={{ margin: 0, fontSize: '0.83rem', color: '#64748b' }}>
              Registros cuyo equipoPeso supera el límite legal. No generan recargo directo, pero pueden requerir autorización especial.
            </p>
          </div>
          <span style={{ fontSize: '1.8rem' }}>⚖️</span>
        </div>
        <table className="regla-table">
          <thead>
            <tr>
              <th>Condición</th>
              <th style={{ textAlign: 'right' }}>Registros excedidos</th>
              <th style={{ textAlign: 'right' }}>Con recargo</th>
              <th style={{ textAlign: 'right' }}>Sin recargo</th>
            </tr>
          </thead>
          <tbody>
            {pesosExcedidos.map((p, i) => (
              <tr key={i}>
                <td>{p.label}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.total.toLocaleString('es-CL')}</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>{p.conRecargo.toLocaleString('es-CL')}</td>
                <td style={{ textAlign: 'right', color: p.sinRecargo > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
                  {p.sinRecargo.toLocaleString('es-CL')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="regla-nota" style={{ marginBottom: 8 }}>
        📌 El monto no recargado es una estimación basada en el totalRackEquipo × tasa de recargo correspondiente.
        El recargo real puede diferir si se aplican descuentos comerciales o combinaciones de recargos.
      </div>
      <div className="regla-footer">
        Fuente: reservas Facturadas y Pagadas · Normativa: Descuentos y Recargos por volumen (oct 2024).
      </div>
    </div>
  );
}

export default AnalisisRecargos;
