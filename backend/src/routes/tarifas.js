import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.resolve(__dirname, '../../../Datos/Tarifas_2024_2025.xlsx');

const toDate = (serial) => {
  if (!serial) return null;
  const d = XLSX.SSF.parse_date_code(serial);
  return `${d.d.toString().padStart(2,'0')}/${d.m.toString().padStart(2,'0')}/${d.y}`;
};

let cache = null;
const getData = () => {
  if (cache) return cache;
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { defval: null });
  cache = raw.map(r => ({
    periodo:         r.Periodo,
    año:             r['Año'],
    mesNombre:       r.Mes_Nombre,
    vigenciaDesde:   toDate(r.Vigencia_Desde),
    vigenciaHasta:   toDate(r.Vigencia_Hasta),
    nCarta:          r.N_Carta,
    ruta:            r.Ruta,
    itemCobro:       r.Item_Cobro,
    largos:          r.Largos,
    unidadCobro:     r.Unidad_Cobro,
    pMonttDestino:   r.P_Montt_a_Destino,
    retornoCargado:  r.Retorno_Cargado,
    retornoVacio:    r.Retorno_Vacio,
  }));
  return cache;
};

router.get('/', (req, res) => {
  try {
    const { periodo, ruta, item } = req.query;
    let data = getData();
    if (periodo) data = data.filter(r => r.periodo === periodo);
    if (ruta)    data = data.filter(r => r.ruta?.toLowerCase().includes(ruta.toLowerCase()));
    if (item)    data = data.filter(r => r.itemCobro?.toLowerCase().includes(item.toLowerCase()));
    res.json(data);
  } catch (e) {
    res.status(500).json({ message: 'Error leyendo tarifas', error: e.message });
  }
});

router.get('/meta', (_req, res) => {
  try {
    const data = getData();
    const periodos = [...new Set(data.map(r => r.periodo))].sort();
    const rutas    = [...new Set(data.map(r => r.ruta))].filter(Boolean).sort();
    const items    = [...new Set(data.map(r => r.itemCobro))].filter(Boolean).sort();
    res.json({ periodos, rutas, items });
  } catch (e) {
    res.status(500).json({ message: 'Error', error: e.message });
  }
});

export default router;
