import { useEffect, useState } from 'react';
import { api } from './api.js';

const fmt = (n) => n != null ? `$${Number(n).toLocaleString('es-CL')}` : '—';

const MESES_ES = {
  January:'Enero', February:'Febrero', March:'Marzo', April:'Abril',
  May:'Mayo', June:'Junio', July:'Julio', August:'Agosto',
  September:'Septiembre', October:'Octubre', November:'Noviembre', December:'Diciembre',
};

function Tarifas() {
  const [meta, setMeta]         = useState({ periodos:[], rutas:[], items:[] });
  const [periodo, setPeriodo]   = useState('');
  const [ruta, setRuta]         = useState('');
  const [item, setItem]         = useState('');
  const [datos, setDatos]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [buscado, setBuscado]   = useState(false);

  useEffect(() => {
    api.get('/tarifas/meta').then(r => {
      setMeta(r.data);
      setPeriodo(r.data.periodos.at(-1) ?? '');
    });
  }, []);

  const buscar = async () => {
    setLoading(true);
    setBuscado(true);
    try {
      const params = {};
      if (periodo) params.periodo = periodo;
      if (ruta)    params.ruta    = ruta;
      if (item)    params.item    = item;
      const r = await api.get('/tarifas', { params });
      setDatos(r.data);
    } catch {
      setDatos([]);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por ruta → item_cobro → filas
  const agrupado = datos.reduce((acc, row) => {
    const r = row.ruta || '—';
    const i = row.itemCobro || '—';
    if (!acc[r]) acc[r] = {};
    if (!acc[r][i]) acc[r][i] = [];
    acc[r][i].push(row);
    return acc;
  }, {});

  const periodoLabel = (p) => {
    const [y, m] = p.split('-');
    const row = datos.find(d => d.periodo === p);
    const mes = row ? (MESES_ES[row.mesNombre] || row.mesNombre) : m;
    return `${mes} ${y}`;
  };

  return (
    <div>
      <h2 className="section-title">Tarifas 2024 – 2025</h2>
      <p className="section-sub">
        Tarifas vigentes por período, ruta e ítem de cobro según Anexo 2.
        Valores en CLP.
      </p>

      {/* Filtros */}
      <div className="tarifas-filtros">
        <div className="filtro-group">
          <label>Período</label>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
            <option value="">Todos</option>
            {meta.periodos.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Ruta</label>
          <select value={ruta} onChange={e => setRuta(e.target.value)}>
            <option value="">Todas</option>
            {meta.rutas.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="filtro-group">
          <label>Ítem de cobro</label>
          <select value={item} onChange={e => setItem(e.target.value)}>
            <option value="">Todos</option>
            {meta.items.map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <button className="btn-buscar" onClick={buscar}>Consultar</button>
      </div>

      {loading && <div className="message">Cargando tarifas...</div>}

      {!loading && buscado && datos.length === 0 && (
        <div className="message">Sin resultados para los filtros seleccionados.</div>
      )}

      {!loading && datos.length > 0 && (
        <>
          {/* Info de vigencia del primer registro */}
          {datos[0] && (
            <div className="tarifa-vigencia">
              <strong>Período:</strong> {periodoLabel(datos[0].periodo)} &nbsp;·&nbsp;
              <strong>Vigencia:</strong> {datos[0].vigenciaDesde} al {datos[0].vigenciaHasta} &nbsp;·&nbsp;
              <strong>N° Carta:</strong> {datos[0].nCarta}
            </div>
          )}

          {Object.entries(agrupado).map(([rutaNombre, items]) => (
            <div key={rutaNombre} className="tarifa-ruta-block">
              <h3 className="tarifa-ruta-titulo">Ruta: {rutaNombre}</h3>

              {Object.entries(items).map(([itemNombre, filas]) => (
                <div key={itemNombre} className="tarifa-item-block">
                  <div className="tarifa-item-header">{itemNombre}</div>
                  <table className="regla-table">
                    <thead>
                      <tr>
                        <th>Tramo / Largo</th>
                        <th>Unidad cobro</th>
                        <th>P. Montt → Destino</th>
                        <th>Retorno cargado</th>
                        <th>Retorno vacío</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f, i) => (
                        <tr key={i}>
                          <td>{f.largos || '—'}</td>
                          <td>{f.unidadCobro || '—'}</td>
                          <td className="tarifa-monto">{fmt(f.pMonttDestino)}</td>
                          <td className="tarifa-monto">{fmt(f.retornoCargado)}</td>
                          <td className="tarifa-monto">{fmt(f.retornoVacio)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {!buscado && (
        <div className="tarifa-placeholder">
          Selecciona un período y haz clic en <strong>Consultar</strong> para ver las tarifas.
        </div>
      )}
    </div>
  );
}

export default Tarifas;
