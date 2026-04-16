import { useEffect, useState } from 'react';
import { api } from './api.js';
import Login from './Login.jsx';

function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setReservations([]);
  };

  const loadReservations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (estado) params.estado = estado;
      const response = await api.get('/reservations', { params });
      setReservations(response.data);
    } catch (error) {
      console.error('Error cargando reservas', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadReservations();
  }, [user]);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-shell">
      <header>
        <div>
          <h1>SaaS de Gestión Naviera</h1>
          <p>Dashboard de reservas de transporte marítimo</p>
        </div>
        <div className="header-user">
          <span>Hola, {user.nombre}</span>
          <button onClick={logout} className="btn-logout">Salir</button>
        </div>
      </header>

      <section className="filters">
        <input
          type="text"
          placeholder="Buscar por cliente, ruta o reserva"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadReservations()}
        />
        <input
          type="text"
          placeholder="Filtrar por estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadReservations()}
        />
        <button onClick={loadReservations}>Buscar</button>
      </section>

      {loading ? (
        <div className="message">Cargando reservas...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Reserva</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th>Ruta</th>
              <th>Nave</th>
              <th>Total</th>
              <th>Pagado</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr><td colSpan="8">No hay datos disponibles.</td></tr>
            ) : (
              reservations.map((item) => (
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
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
