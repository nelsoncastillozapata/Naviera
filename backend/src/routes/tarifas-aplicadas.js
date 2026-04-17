import express from 'express';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import Reservation from '../models/Reservation.js';

const require  = createRequire(import.meta.url);
const XLSX     = require('xlsx');
const router   = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE     = path.resolve(__dirname, '../../../Datos/Tarifas_2024_2025.xlsx');

// ── helpers ──────────────────────────────────────────────────────────────────

let tarifasCache = null;
const getTarifas = () => {
  if (tarifasCache) return tarifasCache;
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const toDate = (s) => {
    if (!s) return null;
    const d = XLSX.SSF.parse_date_code(s);
    return `${d.y}-${String(d.m).padStart(2,'0')}`;
  };
  tarifasCache = XLSX.utils.sheet_to_json(ws, { defval: null }).map(r => ({
    periodo:  r.Periodo,
    ruta:     r.Ruta,
    item:     r.Item_Cobro,
    largos:   r.Largos,
    unidad:   r.Unidad_Cobro,
    destino:  r.P_Montt_a_Destino,
    retCarg:  r.Retorno_Cargado,
    retVacio: r.Retorno_Vacio,
  }));
  return tarifasCache;
};

// Ruta reserva → { rutaTarifa, esRetorno }
const mapRuta = (ruta) => {
  if (!ruta) return null;
  const r = ruta.toUpperCase();
  if (r === 'PMCNAT') return { rutaTarifa: 'Natales',    esRetorno: false };
  if (r === 'NATPMC') return { rutaTarifa: 'Natales',    esRetorno: true  };
  if (r === 'PMCUCO') return { rutaTarifa: 'Chacabuco',  esRetorno: false };
  if (r === 'UCOPMC') return { rutaTarifa: 'Chacabuco',  esRetorno: true  };
  return null;
};

// TipoEquipo → itemCobro + si necesita MLI
const mapItem = (tipo, mli) => {
  if (!tipo) return null;
  const t = tipo.toUpperCase();
  if (/MOTO/.test(t))                                          return { item: 'Motos', usaMli: false };
  if (/VEHÍCULO|VEHICULO|AUTOMOVIL|CAMIONETA|JEEP|VAN/.test(t)) return { item: 'Vehículos Menores', usaMli: false };
  if (/MAQUINARIA|HORQUILLA|CARRO PLANO|CASSETTE/.test(t))     return { item: 'Maquinarias', usaMli: false };
  if (/FURGON|FURGÓN/.test(t))                                 return { item: 'Furgones', usaMli: true };
  // articulados / rampla larga
  const m = parseFloat(mli) || 0;
  if (/ARTICULADO/.test(t) || m >= 16.5)                       return { item: 'Camiones Articulados', usaMli: true };
  if (/CAMION|CAMIÓN|SEMI|RAMPLA|RAMPA|BUS|CARRO/.test(t))    return { item: 'Camiones/Buses/Carros/Semirremolques', usaMli: true };
  return null;
};

// Encuentra el tramo correcto según MLI y lista de largos de la tarifa
const matchLargo = (largosDisponibles, mli) => {
  const m = parseFloat(mli) || 0;
  // Ordenar tramos para encontrar el más específico
  for (const l of largosDisponibles) {
    if (!l) return true; // sin tramo (Motos, Maquinarias, etc.)
    const s = l.toLowerCase();
    if (s.includes('hasta')) {
      const max = parseFloat(s.replace(',','.').match(/[\d.]+/)?.[0]) || 0;
      if (m <= max) return l;
    }
    if (s.includes('desde') && s.includes('a')) {
      const [min, max] = s.replace(',','.').match(/[\d.]+/g).map(Number);
      if (m >= min && m <= max) return l;
    }
    if (s.startsWith('desde') && !s.includes('a')) {
      const min = parseFloat(s.replace(',','.').match(/[\d.]+/)?.[0]) || 0;
      if (m >= min) return l;
    }
  }
  return null;
};

// Extrae periodo yyyy-mm desde fechaZarpe "dd-mm-yyyy hh:mm"
const periodoDeZarpe = (zarpe) => {
  if (!zarpe) return null;
  const m = zarpe.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[3]}-${m[2]}` : null;
};

// Precio esperado según dirección y unidad
const precioEsperado = (tarifa, esRetorno, mli) => {
  const precio = esRetorno ? (tarifa.retCarg ?? tarifa.retVacio) : tarifa.destino;
  if (!precio) return null;
  if (tarifa.unidad === 'Metro Lineal') {
    const m = parseFloat(mli) || 0;
    return m > 0 ? precio * m : null;
  }
  return precio;
};

const RANGOS = [
  { id: 'exacto',    label: 'Sin diferencia (0%)',         min: -1,   max: 1    },
  { id: 'leve_pos',  label: 'Cobrado de más 1–5%',         min: 1,    max: 5    },
  { id: 'mod_pos',   label: 'Cobrado de más 5–15%',        min: 5,    max: 15   },
  { id: 'alto_pos',  label: 'Cobrado de más >15%',         min: 15,   max: 1e9  },
  { id: 'leve_neg',  label: 'Cobrado de menos 1–5%',       min: -5,   max: -1   },
  { id: 'mod_neg',   label: 'Cobrado de menos 5–15%',      min: -15,  max: -5   },
  { id: 'alto_neg',  label: 'Cobrado de menos >15%',       min: -1e9, max: -15  },
];

// ── endpoint ──────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const tarifas = getTarifas();

    const reservas = await Reservation.find({
      estadoReserva: { $in: ['Facturada', 'Pagada'] },
      totalRackEquipo: { $gt: 0 },
    }).select('ruta tipoEquipo equipoMli totalRackEquipo fechaZarpe condicionCarga').lean();

    let sinTarifa = 0;
    let analizados = 0;
    const rangosCount = Object.fromEntries(RANGOS.map(r => [r.id, 0]));
    const porRuta   = {};
    const porTipo   = {};

    for (const res of reservas) {
      const rutaInfo  = mapRuta(res.ruta);
      const itemInfo  = mapItem(res.tipoEquipo, res.equipoMli);
      const periodo   = periodoDeZarpe(res.fechaZarpe);

      if (!rutaInfo || !itemInfo || !periodo) { sinTarifa++; continue; }

      // Filtrar tarifas candidatas
      const candidatas = tarifas.filter(t =>
        t.periodo === periodo &&
        t.ruta === rutaInfo.rutaTarifa &&
        t.item === itemInfo.item
      );
      if (candidatas.length === 0) { sinTarifa++; continue; }

      // Elegir tramo por MLI
      const largosDisp = candidatas.map(c => c.largos);
      const largoMatch = matchLargo(largosDisp, res.equipoMli);
      const tarifa = candidatas.find(c => !c.largos || c.largos === largoMatch);
      if (!tarifa) { sinTarifa++; continue; }

      const esperado = precioEsperado(tarifa, rutaInfo.esRetorno, res.equipoMli);
      if (!esperado || esperado === 0) { sinTarifa++; continue; }

      analizados++;
      const difPct = ((res.totalRackEquipo - esperado) / esperado) * 100;

      const rango = RANGOS.find(r => difPct >= r.min && difPct < r.max);
      if (rango) rangosCount[rango.id]++;

      // por ruta
      const rk = res.ruta;
      if (!porRuta[rk]) porRuta[rk] = { analizados: 0, diferencias: 0, montoExtra: 0 };
      porRuta[rk].analizados++;
      if (Math.abs(difPct) > 1) {
        porRuta[rk].diferencias++;
        porRuta[rk].montoExtra += res.totalRackEquipo - esperado;
      }

      // por tipo equipo
      const tk = res.tipoEquipo;
      if (!porTipo[tk]) porTipo[tk] = { analizados: 0, diferencias: 0 };
      porTipo[tk].analizados++;
      if (Math.abs(difPct) > 1) porTipo[tk].diferencias++;
    }

    res.json({
      totalReservas: reservas.length,
      analizados,
      sinTarifa,
      rangos: RANGOS.map(r => ({ ...r, cantidad: rangosCount[r.id] })),
      porRuta:  Object.entries(porRuta).map(([ruta, v]) => ({ ruta, ...v })).sort((a,b) => b.analizados - a.analizados),
      porTipo:  Object.entries(porTipo).map(([tipo, v]) => ({ tipo, ...v })).sort((a,b) => b.analizados - a.analizados),
    });
  } catch (e) {
    res.status(500).json({ message: 'Error en análisis', error: e.message });
  }
});

export default router;
