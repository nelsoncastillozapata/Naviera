import { useEffect, useRef, useState } from 'react';
import { api } from './api.js';

const fmt = (n) => n != null ? `$${Math.round(n).toLocaleString('es-CL')}` : '—';
const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : '—';

const NIVEL = (score) =>
  score >= 90 ? { txt: 'CONFORME', color: '#16a34a', bg: '#f0fdf4' } :
  score >= 75 ? { txt: 'OBSERVADO', color: '#d97706', bg: '#fffbeb' } :
               { txt: 'NO CONFORME', color: '#dc2626', bg: '#fef2f2' };

function Semaforo({ score, umbral }) {
  const n = NIVEL(score);
  return (
    <span style={{ padding: '3px 12px', borderRadius: 20, background: n.bg, color: n.color, fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${n.color}` }}>
      {n.txt} · {score}%
    </span>
  );
}

function SeccionHallazgo({ numero, titulo, score, umbral, children }) {
  const n = NIVEL(score);
  return (
    <div style={{ border: `1px solid ${n.color}`, borderLeft: `5px solid ${n.color}`, borderRadius: 6, padding: '16px 20px', marginBottom: 20, background: n.bg }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>Hallazgo {numero}</span>
          <h3 style={{ margin: '4px 0 0', color: '#1e293b', fontSize: '1rem' }}>{titulo}</h3>
        </div>
        <Semaforo score={score} umbral={umbral} />
      </div>
      {children}
    </div>
  );
}

function Informe() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const printRef = useRef(null);

  useEffect(() => {
    api.get('/informe')
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el informe.'))
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8"/>
      <title>Informe Auditoría – Naviera Magallanes</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; padding: 24px; background: #fff; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 16px 0 8px; }
        h3 { font-size: 12px; margin: 12px 0 6px; }
        h4 { font-size: 11px; margin: 8px 0 4px; }
        p  { line-height: 1.6; margin-bottom: 8px; }
        ol { padding-left: 18px; line-height: 1.8; }
        .dash-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11px; }
        th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border-bottom: 1px solid #f1f5f9; padding: 5px 8px; }
        tr:last-child td { border-bottom: none; }
        @page { margin: 18mm 15mm; }
        @media print { body { padding: 0; } .no-print { display: none !important; } }
      </style>
    </head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  if (loading) return <div className="message">Generando informe de auditoría… puede tardar unos segundos.</div>;
  if (error)   return <div className="message">{error}</div>;

  const { kpiBase, tarifas, cargaPeligrosa, sobreancho, descuentos, operacional, scores, scoreGlobal, generadoEn } = data;
  const fechaInforme = new Date(generadoEn).toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' });
  const nivelGlobal  = NIVEL(scoreGlobal);
  const montoNoRecargadoTotal = cargaPeligrosa.montoNoAplicado + sobreancho.montoNoAplicado;
  const montoImpactoTotal     = tarifas.montoSubcobro + montoNoRecargadoTotal;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Botón imprimir */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          🖨 Imprimir / Guardar PDF
        </button>
      </div>

      <div ref={printRef}>

      {/* Portada */}
      <div className="dash-card" style={{ marginBottom: 24, borderTop: '6px solid #1e3a8a', textAlign: 'center', padding: '32px 24px' }}>
        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>Informe de Auditoría Tarifaria y Normativa</div>
        <h1 style={{ fontSize: '1.6rem', color: '#1e293b', margin: '0 0 4px' }}>Naviera Magallanes — Período oct 2024 – dic 2025</h1>
        <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '0.9rem' }}>Revisión de cumplimiento tarifario, aplicación de recargos y coherencia de descuentos por volumen</p>
        <div style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 24, background: nivelGlobal.bg, border: `2px solid ${nivelGlobal.color}` }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Calificación global</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: nivelGlobal.color }}>{scoreGlobal}%</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: nivelGlobal.color, display: 'block' }}>{nivelGlobal.txt}</span>
        </div>
        <div style={{ marginTop: 16, fontSize: '0.78rem', color: '#94a3b8' }}>Generado el {fechaInforme} · {kpiBase.total.toLocaleString('es-CL')} reservas analizadas</div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: 12 }}>1. Resumen Ejecutivo</h2>
        <p style={{ lineHeight: 1.7, color: '#374151', fontSize: '0.9rem' }}>
          El presente informe analiza <strong>{kpiBase.total.toLocaleString('es-CL')} reservas</strong> del período octubre 2024 a diciembre 2025,
          de las cuales <strong>{(kpiBase.facturadas + kpiBase.pagadas).toLocaleString('es-CL')}</strong> se encuentran en estado Facturado o Pagado
          ({pct(kpiBase.facturadas + kpiBase.pagadas, kpiBase.total)} del universo). El monto total de tarifa rack asciende a <strong>{fmt(kpiBase.montoRack)}</strong>.
        </p>
        <p style={{ lineHeight: 1.7, color: '#374151', fontSize: '0.9rem' }}>
          La auditoría revela <strong style={{ color: '#dc2626' }}>incumplimientos significativos</strong> en la aplicación de recargos por sobreancho
          ({sobreancho.sinRecargo.toLocaleString('es-CL')} casos sin recargo, {pct(sobreancho.sinRecargo, sobreancho.total)} del total afecto),
          con un impacto económico estimado en <strong style={{ color: '#dc2626' }}>{fmt(montoImpactoTotal)}</strong> entre subcobros tarifarios y
          recargos no aplicados. Se identifican además anomalías en la coherencia de descuentos por volumen en{' '}
          <strong>{descuentos.transMal.toLocaleString('es-CL')} transiciones</strong> entre meses consecutivos.
        </p>
        <table className="regla-table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Ámbito auditado</th>
              <th style={{ textAlign:'center' }}>Score</th>
              <th style={{ textAlign:'center' }}>Umbral</th>
              <th style={{ textAlign:'center' }}>Estado</th>
              <th style={{ textAlign:'right' }}>Impacto estimado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Exactitud tarifas aplicadas</td>
              <td style={{ textAlign:'center', fontWeight:700 }}>{scores.tarifas.score}%</td>
              <td style={{ textAlign:'center', color:'#64748b' }}>{scores.tarifas.umbral}%</td>
              <td style={{ textAlign:'center' }}><Semaforo score={scores.tarifas.score} umbral={scores.tarifas.umbral} /></td>
              <td style={{ textAlign:'right', color:'#7c3aed', fontWeight:600 }}>{fmt(tarifas.montoSubcobro)}</td>
            </tr>
            <tr>
              <td>Recargo carga peligrosa</td>
              <td style={{ textAlign:'center', fontWeight:700 }}>{scores.cargaPeligrosa.score}%</td>
              <td style={{ textAlign:'center', color:'#64748b' }}>{scores.cargaPeligrosa.umbral}%</td>
              <td style={{ textAlign:'center' }}><Semaforo score={scores.cargaPeligrosa.score} umbral={scores.cargaPeligrosa.umbral} /></td>
              <td style={{ textAlign:'right', color:'#dc2626', fontWeight:600 }}>{fmt(cargaPeligrosa.montoNoAplicado)}</td>
            </tr>
            <tr>
              <td>Recargo sobreancho</td>
              <td style={{ textAlign:'center', fontWeight:700 }}>{scores.sobreancho.score}%</td>
              <td style={{ textAlign:'center', color:'#64748b' }}>{scores.sobreancho.umbral}%</td>
              <td style={{ textAlign:'center' }}><Semaforo score={scores.sobreancho.score} umbral={scores.sobreancho.umbral} /></td>
              <td style={{ textAlign:'right', color:'#dc2626', fontWeight:600 }}>{fmt(sobreancho.montoNoAplicado)}</td>
            </tr>
            <tr>
              <td>Coherencia descuentos volumen</td>
              <td style={{ textAlign:'center', fontWeight:700 }}>{scores.descuentos.score}%</td>
              <td style={{ textAlign:'center', color:'#64748b' }}>{scores.descuentos.umbral}%</td>
              <td style={{ textAlign:'center' }}><Semaforo score={scores.descuentos.score} umbral={scores.descuentos.umbral} /></td>
              <td style={{ textAlign:'right', color:'#d97706', fontWeight:600 }}>Sin cuantificar</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Hallazgo 1 — Tarifas */}
      <SeccionHallazgo numero="1" titulo="Exactitud en la aplicación de tarifas según tabla oficial" score={scores.tarifas.score} umbral={scores.tarifas.umbral}>
        <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
          De las <strong>{tarifas.matcheadas.toLocaleString('es-CL')}</strong> reservas con tarifa de referencia identificable,
          solo <strong>{tarifas.ok.toLocaleString('es-CL')}</strong> ({pct(tarifas.ok, tarifas.matcheadas)}) corresponden exactamente
          a la tarifa rack vigente (tolerancia ±1%). Se detectan <strong style={{ color:'#7c3aed' }}>{tarifas.difNeg.toLocaleString('es-CL')} casos de subcobro</strong>{' '}
          por un monto acumulado de <strong style={{ color:'#7c3aed' }}>{fmt(tarifas.montoSubcobro)}</strong>,
          y <strong style={{ color:'#f59e0b' }}>{tarifas.difPos.toLocaleString('es-CL')} casos de sobrecobro</strong>{' '}
          por <strong style={{ color:'#f59e0b' }}>{fmt(tarifas.montoSobrecobro)}</strong>.
          Adicionalmente, <strong>{tarifas.sinTarifa.toLocaleString('es-CL')}</strong> registros no pudieron ser validados por ausencia de
          tarifa de referencia en la tabla oficial (tipo de equipo no mapeado o período sin cobertura).
        </p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: '0.83rem', color: '#374151', marginTop: 8 }}>
          <strong>Causas probables:</strong> (1) Aplicación de descuentos comerciales negociados directamente que reducen el rack sin registro separado.
          (2) Errores en la parametrización del sistema al inicio de período tarifario.
          (3) Categorías de equipo no contempladas en la tabla (vehículos especiales, maquinaria agrícola).
          <br /><br />
          <strong>Recomendación:</strong> Implementar validación automática en el sistema al momento de emisión de la reserva, con alerta cuando el monto
          rack difiera más del 5% de la tarifa de referencia. Revisar la cobertura de la tabla tarifaria para incluir todas las categorías operativas.
        </div>
      </SeccionHallazgo>

      {/* Hallazgo 2 — Carga peligrosa */}
      <SeccionHallazgo numero="2" titulo="Aplicación del recargo por carga peligrosa (20%)" score={scores.cargaPeligrosa.score} umbral={scores.cargaPeligrosa.umbral}>
        <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
          De los <strong>{cargaPeligrosa.total.toLocaleString('es-CL')}</strong> equipos clasificados como CARGA PELIGROSA,
          <strong style={{ color:'#dc2626' }}> {cargaPeligrosa.sinRecargo.toLocaleString('es-CL')}</strong> ({pct(cargaPeligrosa.sinRecargo, cargaPeligrosa.total)})
          no registran recargo aplicado. El monto esperado de recargos asciende a <strong>{fmt(cargaPeligrosa.montoEsperado)}</strong>,
          mientras que el monto efectivamente aplicado es <strong>{fmt(cargaPeligrosa.montoAplicado)}</strong>,
          resultando en una brecha de <strong style={{ color:'#dc2626' }}>{fmt(cargaPeligrosa.montoNoAplicado)}</strong>.
        </p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: '0.83rem', color: '#374151', marginTop: 8 }}>
          <strong>Causas probables:</strong> (1) El sistema no aplica automáticamente el recargo al ingresar la clasificación de carga peligrosa.
          (2) Acuerdos comerciales con clientes frecuentes que eximen el recargo sin documentación normativa.
          (3) Error de clasificación: equipo ingresado con tipoCarga = CARGA PELIGROSA pero tratado como carga general.
          <br /><br />
          <strong>Consideración normativa:</strong> El recargo por carga peligrosa está definido en la normativa de la autoridad marítima y no admite
          excepciones comerciales. Los {cargaPeligrosa.sinRecargo.toLocaleString('es-CL')} casos sin recargo representan un riesgo regulatorio que
          puede derivar en observaciones de la Dirección de Obras Portuarias o la Armada de Chile.
        </div>
      </SeccionHallazgo>

      {/* Hallazgo 3 — Sobreancho */}
      <SeccionHallazgo numero="3" titulo="Aplicación de recargos por sobreancho (50% / 100% / 200%)" score={scores.sobreancho.score} umbral={scores.sobreancho.umbral}>
        <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
          Este hallazgo constituye el de mayor impacto económico del presente informe.
          De los <strong>{sobreancho.total.toLocaleString('es-CL')}</strong> equipos con ancho superior a 2.6 m que requieren recargo por sobreancho,
          <strong style={{ color:'#dc2626' }}> {sobreancho.sinRecargo.toLocaleString('es-CL')}</strong> ({pct(sobreancho.sinRecargo, sobreancho.total)})
          carecen de recargo registrado. La diferencia entre el monto esperado <strong>({fmt(sobreancho.montoEsperado)})</strong> y
          el aplicado <strong>({fmt(sobreancho.montoAplicado)})</strong> arroja una brecha estimada de{' '}
          <strong style={{ color:'#dc2626' }}>{fmt(sobreancho.montoNoAplicado)}</strong>.
        </p>
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: 12, fontSize: '0.83rem', color: '#374151', marginTop: 8 }}>
          <strong>⚠ Alerta de alta criticidad:</strong> La tasa de incumplimiento en sobreancho supera el {pct(sobreancho.sinRecargo, sobreancho.total)},
          lo que sugiere una falla sistémica y no casos aislados. Este nivel de incumplimiento sostenido en el tiempo podría configurar una
          práctica comercial irregular frente a la autoridad fiscalizadora.
          <br /><br />
          <strong>Causas probables:</strong> (1) El campo equipoAncho no está integrado al módulo de cálculo de recargos.
          (2) Los operadores ingresan el ancho del equipo pero el sistema no dispara automáticamente el cálculo del recargo.
          (3) Existencia de acuerdos de precio global que absorben el recargo sin desglosarlo.
          <br /><br />
          <strong>Recomendación urgente:</strong> Auditoría inmediata del módulo de cálculo de recargos. Revisión de los contratos con los clientes de mayor
          volumen de sobreancho. Generación de notas de cobro retroactivas donde sea procedente.
        </div>
      </SeccionHallazgo>

      {/* Hallazgo 4 — Descuentos */}
      <SeccionHallazgo numero="4" titulo="Coherencia de descuentos por volumen (criterio mes M-1)" score={scores.descuentos.score} umbral={scores.descuentos.umbral}>
        <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
          El análisis de consistencia intra-mensual identifica{' '}
          <strong style={{ color:'#d97706' }}>{descuentos.varAlta.toLocaleString('es-CL')} períodos cliente-mes</strong> con alta varianza en la tasa
          de descuento ({pct(descuentos.varAlta, descuentos.totalClienteMes)} del total de {descuentos.totalClienteMes.toLocaleString('es-CL')} combinaciones analizadas),
          lo que indica que el mismo cliente recibió descuentos distintos en el mismo mes sin justificación aparente.
        </p>
        <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.7 }}>
          En el análisis de correlación direccional volumen→descuento,{' '}
          <strong style={{ color:'#dc2626' }}>{descuentos.transMal.toLocaleString('es-CL')}</strong> de{' '}
          <strong>{descuentos.transTotal.toLocaleString('es-CL')}</strong> transiciones entre meses consecutivos presentan anomalías:
          el descuento se movió en dirección contraria al volumen del mes anterior, contradiciendo la política de descuentos por volumen vigente.
        </p>
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: '0.83rem', color: '#374151', marginTop: 8 }}>
          <strong>Causas probables:</strong> (1) Descuentos negociados ad-hoc sin respetar la tabla de tramos de volumen.
          (2) Falta de automatización en la actualización mensual de tramos según historial del cliente.
          (3) Posibles acuerdos comerciales verbales o informales que no quedan reflejados en el sistema.
          <br /><br />
          <strong>Recomendación:</strong> Implementar un proceso mensual de actualización de la categoría de descuento de cada cliente en base al volumen
          del mes anterior, con registro de la base de cálculo. Documentar formalmente cualquier excepción al criterio de descuento por volumen.
        </div>
      </SeccionHallazgo>

      {/* Contexto operacional */}
      <div className="dash-card" style={{ marginBottom: 20 }}>
        <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: 12 }}>2. Contexto Operacional</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ color:'#374151', margin:'0 0 8px', fontSize:'0.9rem' }}>Distribución por ruta</h4>
            <table className="regla-table">
              <thead><tr><th>Ruta</th><th style={{textAlign:'right'}}>Reservas</th><th style={{textAlign:'right'}}>Monto rack</th></tr></thead>
              <tbody>
                {operacional.porRuta.map(r => (
                  <tr key={r.ruta}>
                    <td>{r.ruta}</td>
                    <td style={{ textAlign:'right' }}>{r.cnt.toLocaleString('es-CL')}</td>
                    <td style={{ textAlign:'right' }}>{fmt(r.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 style={{ color:'#374151', margin:'0 0 8px', fontSize:'0.9rem' }}>Naves operativas</h4>
            <table className="regla-table">
              <thead><tr><th>Nave</th><th style={{textAlign:'right'}}>Reservas</th><th style={{textAlign:'right'}}>Monto rack</th></tr></thead>
              <tbody>
                {operacional.porNave.slice(0,5).map(n => (
                  <tr key={n.nave}>
                    <td>{n.nave}</td>
                    <td style={{ textAlign:'right' }}>{n.cnt.toLocaleString('es-CL')}</td>
                    <td style={{ textAlign:'right' }}>{fmt(n.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ fontSize: '0.83rem', color: '#374151', lineHeight: 1.7, marginTop: 12 }}>
          La operación se concentra en las rutas Puerto Montt–Natales y Puerto Montt–Chacabuco.
          La tasa de anulación es de <strong>{pct(kpiBase.anuladas, kpiBase.total)}</strong>, nivel dentro de rangos aceptables
          para operaciones de transporte marítimo en condiciones climáticas adversas de la región de Magallanes.
          La concentración en los 3 principales clientes alcanza el <strong>{operacional.concentracionTop3pct}%</strong> del
          monto total, lo que representa un riesgo de dependencia comercial moderado-alto.
        </p>
      </div>

      {/* Conclusiones */}
      <div className="dash-card" style={{ marginBottom: 20, borderTop: '4px solid #1e3a8a' }}>
        <h2 style={{ color: '#1e293b', fontSize: '1.1rem', marginBottom: 12 }}>3. Conclusiones y Recomendaciones</h2>
        <ol style={{ paddingLeft: 20, lineHeight: 2, fontSize: '0.88rem', color: '#374151' }}>
          <li>
            <strong>Prioridad Alta — Recargos por sobreancho:</strong> Con un {pct(sobreancho.sinRecargo, sobreancho.total)} de incumplimiento
            y un impacto estimado de {fmt(sobreancho.montoNoAplicado)}, se requiere acción correctiva inmediata en el módulo de cálculo.
            Este hallazgo debe ser informado a la administración superior de la naviera.
          </li>
          <li>
            <strong>Prioridad Alta — Recargos carga peligrosa:</strong> {cargaPeligrosa.sinRecargo.toLocaleString('es-CL')} casos sin
            recargo ({pct(cargaPeligrosa.sinRecargo, cargaPeligrosa.total)}) representan un riesgo normativo y económico concreto
            ({fmt(cargaPeligrosa.montoNoAplicado)} estimados).
          </li>
          <li>
            <strong>Prioridad Media — Exactitud tarifaria:</strong> El {pct(tarifas.difNeg, tarifas.matcheadas)} de subcobros
            ({fmt(tarifas.montoSubcobro)}) sugiere que la integración entre la tabla tarifaria vigente y el sistema de reservas
            requiere revisión y automatización.
          </li>
          <li>
            <strong>Prioridad Media — Política de descuentos:</strong> Las anomalías en la correlación volumen→descuento apuntan a
            la necesidad de formalizar y automatizar el proceso de actualización mensual de tramos de descuento.
          </li>
          <li>
            <strong>Gestión de riesgo:</strong> La concentración de negocio en pocos clientes ({operacional.concentracionTop3pct}% en top 3)
            y la dependencia de dos rutas principales sugiere diversificación como objetivo estratégico de mediano plazo.
          </li>
        </ol>
        <div style={{ marginTop: 16, padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: '0.83rem', color: '#1e40af' }}>
          <strong>Nota metodológica:</strong> El presente informe se basa en el análisis de datos exportados del sistema de reservas.
          Los montos de impacto son estimaciones calculadas sobre la tarifa rack sin considerar descuentos comerciales aplicables.
          El impacto real puede diferir si existen acuerdos de precio global o descuentos autorizados no reflejados en los campos
          de recargo del sistema. Se recomienda complementar este análisis con la revisión de contratos marco y condiciones especiales vigentes.
        </div>
      </div>

      <div className="regla-footer">
        Informe generado el {fechaInforme} · Fuente: sistema de reservas Naviera Magallanes · {kpiBase.total.toLocaleString('es-CL')} reservas analizadas (oct 2024 – dic 2025)
      </div>

      </div>{/* /printRef */}
    </div>
  );
}

export default Informe;
