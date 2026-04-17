import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import Sidebar from './Sidebar.jsx';
import Reglas from './Reglas.jsx';
import Tarifas from './Tarifas.jsx';
import TarifasAplicadas from './TarifasAplicadas.jsx';
import AnalisisRecargos from './AnalisisRecargos.jsx';
import AnalisisDescuentos from './AnalisisDescuentos.jsx';

function ReservasView() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (estado) params.estado = estado;
      const r = await api.get('/reservations', { params });
      setReservations(r.data);
    } catch {
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <h2 className="section-title">Reservas</h2>
      <section className="filters">
        <input
          type="text"
          placeholder="Buscar por cliente, ruta o reserva"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <input
          type="text"
          placeholder="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
        />
        <button onClick={load}>Buscar</button>
      </section>

      {loading ? (
        <div className="message">Cargando reservas...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Reserva</th><th>Cliente</th><th>Estado</th>
              <th>Fecha</th><th>Ruta</th><th>Nave</th>
              <th>Total</th><th>Pagado</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr><td colSpan="8">No hay datos.</td></tr>
            ) : reservations.map((item) => (
              <tr key={item._id}>
                <td>{item.numeroReserva}</td>
                <td>{item.clienteNombre}</td>
                <td><span className={`badge badge-${item.estadoReserva?.toLowerCase()}`}>{item.estadoReserva}</span></td>
                <td>{item.fechaCreacion}</td>
                <td>{item.ruta}</td>
                <td>{item.nave}</td>
                <td>{item.totalReserva?.toLocaleString('es-CL') || '0'}</td>
                <td>{item.totalPagado?.toLocaleString('es-CL') || '0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const s = localStorage.getItem('user');
    return s ? JSON.parse(s) : null;
  });
  const [vista, setVista] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        vista={vista}
        onVista={setVista}
      />
      <div className="layout-main">
        <header>
          <div>
            <h1>SaaS de Gestión Naviera</h1>
            <p>Transporte marítimo · Magallanes</p>
          </div>
          <div className="header-user">
            <span>Hola, {user.nombre}</span>
            <button onClick={logout} className="btn-logout">Salir</button>
          </div>
        </header>
        {vista === 'dashboard' && <Dashboard />}
        {vista === 'reservas'  && <ReservasView />}
        {vista === 'tarifas'            && <Tarifas />}
        {vista === 'tarifas-aplicadas'  && <TarifasAplicadas />}
        {vista === 'analisis-recargos'    && <AnalisisRecargos />}
        {vista === 'analisis-descuentos' && <AnalisisDescuentos />}
        {vista === 'reglas'    && <Reglas />}
      </div>
    </div>
  );
}

export default App;
