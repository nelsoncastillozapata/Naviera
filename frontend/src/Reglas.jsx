const SECCIONES = [
  {
    titulo: 'Recargos por tipo de carga',
    icono: '⚠️',
    color: '#ef4444',
    descripcion: 'Se aplican recargos sobre la tarifa base según la clasificación de peligrosidad de la carga.',
    tabla: {
      headers: ['Clase de peligro', 'Recargo'],
      rows: [
        ['Clase 2 (Gases)', '20%'],
        ['Clase 3 (Líquidos inflamables)', '20%'],
        ['Clase 4 (Sólidos inflamables)', '20%'],
        ['Clase 5 (Oxidantes y peróxidos)', '20%'],
        ['Clase 8 (Sustancias corrosivas)', '20%'],
        ['Clase 9 (Materias peligrosas diversas)', '20%'],
        ['Otras clases', 'Consultar asesor'],
      ],
    },
  },
  {
    titulo: 'Recargos por sobreancho',
    icono: '↔️',
    color: '#f59e0b',
    descripcion: 'Equipos que superen el ancho estándar están sujetos a recargos progresivos según tramo.',
    tabla: {
      headers: ['Rango de ancho', 'Recargo'],
      rows: [
        ['2.6 m – 3.0 m', '50%'],
        ['3.1 m – 4.0 m', '100%'],
        ['4.1 m – 5.0 m', '200%'],
      ],
    },
  },
  {
    titulo: 'Recargos por sobre altura',
    icono: '↕️',
    color: '#8b5cf6',
    descripcion: 'Carga que supere la altura máxima estándar queda afecta a recargo.',
    tabla: {
      headers: ['Condición', 'Recargo'],
      rows: [
        ['Altura mayor a 4.2 m', '20%'],
      ],
    },
  },
  {
    titulo: 'Pesos máximos permitidos',
    icono: '⚖️',
    color: '#0ea5e9',
    descripcion: 'Pesos brutos máximos por tipo de equipo autorizados para embarque.',
    tabla: {
      headers: ['Tipo de equipo', 'Peso máximo'],
      rows: [
        ['Camión articulado', '55.000 kg'],
        ['Semirremolque doble eje', '40.000 kg'],
        ['Semirremolque triple eje', '40.000 kg'],
      ],
    },
  },
  {
    titulo: 'Descuentos por volumen',
    icono: '📦',
    color: '#10b981',
    descripcion: 'Se aplican descuentos sobre tarifa según el volumen mensual embarcado por cliente. La tabla de tramos se coordina con el ejecutivo de cuentas asignado.',
    nota: 'Para acceder a la tabla de descuentos vigente contactar al ejecutivo comercial responsable de la cuenta.',
  },
];

function SeccionRegla({ titulo, icono, color, descripcion, tabla, nota }) {
  return (
    <div className="regla-card">
      <div className="regla-card-header" style={{ borderLeft: `4px solid ${color}` }}>
        <span className="regla-card-icono">{icono}</span>
        <div>
          <h3>{titulo}</h3>
          <p>{descripcion}</p>
        </div>
      </div>

      {tabla && (
        <table className="regla-table">
          <thead>
            <tr>
              {tabla.headers.map((h, i) => <th key={i}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {tabla.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {nota && <div className="regla-nota">📌 {nota}</div>}
    </div>
  );
}

function Reglas() {
  return (
    <div>
      <h2 className="section-title">Reglas de negocio</h2>
      <p className="section-sub">
        Normativa operacional vigente extraída del documento de tarifas y condiciones de embarque.
      </p>

      <div className="reglas-grid">
        {SECCIONES.map((s, i) => <SeccionRegla key={i} {...s} />)}
      </div>

      <div className="regla-footer">
        Fuente: <em>Descuentos y Recargos por volumen</em> · Última revisión incluida en el sistema: oct 2024.
      </div>
    </div>
  );
}

export default Reglas;
