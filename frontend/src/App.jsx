import { useEffect, useState } from 'react';
import { api } from './api.js';

function App() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [loading, setLoading] = useState(false);

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
    loadReservations();
  }, []);

  return (
    <div className="app-shell">
      <header>
        <h1>SaaS de Gestión Naviera</h1>
        <p>Dashboard inicial con datos de reservas cargados desde el CSV.</p>
      </header>

      <section className="filters">
        <input
          type="text"
          placeholder="Buscar por cliente, ruta o reserva"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por estado"
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
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
              <tr>
                <td colSpan="8">No hay datos disponibles.</td>
              </tr>
            ) : (
              reservations.map((item) => (
                <tr key={item._id}>
                  <td>{item.numeroReserva}</td>
                  <td>{item.clienteNombre}</td>
                  <td>{item.estadoReserva}</td>
                  <td>{item.fechaCreacion}</td>
                  <td>{item.ruta}</td>
                  <td>{item.nave}</td>
                  <td>{item.totalReserva?.toLocaleString() || '0'}</td>
                  <td>{item.totalPagado?.toLocaleString() || '0'}</td>
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
