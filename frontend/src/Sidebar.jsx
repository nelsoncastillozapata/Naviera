import { useState } from 'react';

const REGLAS = [
  {
    grupo: 'Recargos por tipo de carga',
    icono: '⚠️',
    items: [
      { titulo: 'Carga peligrosa clase 2, 3, 4, 5, 8, 9', detalle: '20% de recargo sobre tarifa base.' },
      { titulo: 'Otras clases peligrosas', detalle: 'Consultar con asesor comercial.' },
    ],
  },
  {
    grupo: 'Recargos por sobreancho',
    icono: '↔️',
    items: [
      { titulo: '2.6 m – 3.0 m', detalle: '50% de recargo.' },
      { titulo: '3.1 m – 4.0 m', detalle: '100% de recargo.' },
      { titulo: '4.1 m – 5.0 m', detalle: '200% de recargo.' },
    ],
  },
  {
    grupo: 'Recargos por sobre altura',
    icono: '↕️',
    items: [
      { titulo: 'Altura mayor a 4.2 m', detalle: '20% de recargo sobre tarifa base.' },
    ],
  },
  {
    grupo: 'Pesos máximos permitidos',
    icono: '⚖️',
    items: [
      { titulo: 'Camión articulado', detalle: 'Máximo 55.000 kg.' },
      { titulo: 'Semirremolque doble eje', detalle: 'Máximo 40.000 kg.' },
      { titulo: 'Semirremolque triple eje', detalle: 'Máximo 40.000 kg.' },
    ],
  },
  {
    grupo: 'Descuentos por volumen',
    icono: '📦',
    items: [
      { titulo: 'Tabla de descuentos', detalle: 'Aplica según volumen mensual embarcado. Consultar con ejecutivo de cuentas.' },
    ],
  },
];

function ReglaGrupo({ grupo, icono, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="regla-grupo">
      <button className="regla-header" onClick={() => setOpen(!open)}>
        <span>{icono} {grupo}</span>
        <span className={`regla-chevron ${open ? 'open' : ''}`}>›</span>
      </button>
      {open && (
        <ul className="regla-items">
          {items.map((item, i) => (
            <li key={i}>
              <strong>{item.titulo}</strong>
              <span>{item.detalle}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Sidebar({ collapsed, onToggle, vista, onVista }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && <span className="sidebar-brand">⚓ Naviera</span>}
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expandir' : 'Contraer'}>
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-nav-item ${vista === 'dashboard' ? 'active' : ''}`}
          onClick={() => onVista('dashboard')}
        >
          <span className="nav-icon">📊</span>
          {!collapsed && <span>Dashboard</span>}
        </button>
        <button
          className={`sidebar-nav-item ${vista === 'reservas' ? 'active' : ''}`}
          onClick={() => onVista('reservas')}
        >
          <span className="nav-icon">📋</span>
          {!collapsed && <span>Reservas</span>}
        </button>
      </nav>

      {!collapsed && (
        <div className="sidebar-rules">
          <div className="sidebar-rules-title">Reglas de negocio</div>
          {REGLAS.map((r, i) => (
            <ReglaGrupo key={i} {...r} />
          ))}
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
