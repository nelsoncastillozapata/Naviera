const NAV = [
  { id: 'dashboard', icono: '📊', label: 'Dashboard' },
  { id: 'reservas',  icono: '📋', label: 'Reservas'  },
  { id: 'tarifas',          icono: '💰', label: 'Tarifas'          },
  { id: 'tarifas-aplicadas',  icono: '🔍', label: 'Tarifas aplicadas'  },
  { id: 'analisis-recargos',    icono: '📈', label: 'Análisis recargos'    },
  { id: 'analisis-descuentos', icono: '🏷️', label: 'Análisis descuentos'  },
  { id: 'reglas',    icono: '📜', label: 'Reglas'     },
];

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
        {NAV.map(({ id, icono, label }) => (
          <button
            key={id}
            className={`sidebar-nav-item ${vista === id ? 'active' : ''}`}
            onClick={() => onVista(id)}
          >
            <span className="nav-icon">{icono}</span>
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
