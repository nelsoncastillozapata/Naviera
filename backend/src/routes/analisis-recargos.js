import express from 'express';
import Reservation from '../models/Reservation.js';

const router = express.Router();

// Rangos de diferencia porcentual
const RANGOS_DIF = [
  { id: 'correcto',  label: 'Recargo correcto (±10%)',      min: -10,  max: 10   },
  { id: 'exceso',    label: 'Recargo en exceso (>10%)',      min: 10,   max: 1e9  },
  { id: 'deficit_l', label: 'Recargo menor 10–50%',         min: -50,  max: -10  },
  { id: 'deficit_a', label: 'Recargo menor >50%',           min: -1e9, max: -50  },
];

const clasificarDif = (real, esperado) => {
  if (!esperado || esperado === 0) return null;
  const pct = ((real - esperado) / esperado) * 100;
  return RANGOS_DIF.find(r => pct >= r.min && pct < r.max)?.id ?? null;
};

router.get('/', async (req, res) => {
  try {
    const base = { estadoReserva: { $in: ['Facturada', 'Pagada'] }, totalRackEquipo: { $gt: 0 } };

    // ── 1. CARGA PELIGROSA (20%) ──────────────────────────────────────────────
    const peligrosas = await Reservation.find({ ...base, tipoCarga: 'CARGA PELIGROSA' })
      .select('totalRackEquipo totalRecargosEquipo').lean();

    const cpStats = { total: 0, debeRecargo: 0, sinRecargo: 0, conRecargo: 0, montoEsperado: 0, montoAplicado: 0, rangos: {} };
    RANGOS_DIF.forEach(r => { cpStats.rangos[r.id] = 0; });

    for (const r of peligrosas) {
      cpStats.total++;
      cpStats.debeRecargo++;
      const esperado = r.totalRackEquipo * 0.20;
      cpStats.montoEsperado += esperado;
      cpStats.montoAplicado += r.totalRecargosEquipo ?? 0;

      if (!r.totalRecargosEquipo || r.totalRecargosEquipo <= 0) {
        cpStats.sinRecargo++;
      } else {
        cpStats.conRecargo++;
        const clase = clasificarDif(r.totalRecargosEquipo, esperado);
        if (clase) cpStats.rangos[clase]++;
      }
    }

    // ── 2. SOBREANCHO ─────────────────────────────────────────────────────────
    const TRAMOS_ANCHO = [
      { id: 'sa_leve', label: '2.6 – 3.0 m', pct: 0.50, minA: 2.6, maxA: 3.0 },
      { id: 'sa_mod',  label: '3.1 – 4.0 m', pct: 1.00, minA: 3.1, maxA: 4.0 },
      { id: 'sa_alto', label: '4.1 m o más', pct: 2.00, minA: 4.1, maxA: 99  },
    ];

    const tramosAncho = [];
    for (const tramo of TRAMOS_ANCHO) {
      const registros = await Reservation.find({
        ...base,
        $expr: {
          $and: [
            { $gte: [{ $toDouble: '$equipoAncho' }, tramo.minA] },
            { $lte: [{ $toDouble: '$equipoAncho' }, tramo.maxA] },
          ],
        },
      }).select('totalRackEquipo totalRecargosEquipo').lean();

      const stats = { ...tramo, total: 0, sinRecargo: 0, conRecargo: 0, montoEsperado: 0, montoAplicado: 0, rangos: {} };
      RANGOS_DIF.forEach(r => { stats.rangos[r.id] = 0; });

      for (const r of registros) {
        stats.total++;
        const esperado = r.totalRackEquipo * tramo.pct;
        stats.montoEsperado += esperado;
        stats.montoAplicado += r.totalRecargosEquipo ?? 0;

        if (!r.totalRecargosEquipo || r.totalRecargosEquipo <= 0) {
          stats.sinRecargo++;
        } else {
          stats.conRecargo++;
          const clase = clasificarDif(r.totalRecargosEquipo, esperado);
          if (clase) stats.rangos[clase]++;
        }
      }
      tramosAncho.push(stats);
    }

    // ── 3. PESOS EXCEDIDOS ────────────────────────────────────────────────────
    const LIMITES_PESO = [
      { label: 'Semirremolque > 40.000 kg',   filtro: { tipoEquipo: /SEMIRREMOLQUE/i,            equipoPeso: { $gt: 40000 } } },
      { label: 'Camión articulado > 55.000 kg',filtro: { tipoEquipo: /ARTICULADO/i,               equipoPeso: { $gt: 55000 } } },
      { label: 'Camión / Rampla > 55.000 kg',  filtro: { tipoEquipo: /CAMIÓN|CAMION/i,            equipoPeso: { $gt: 55000 } } },
    ];

    const pesosExcedidos = [];
    for (const lim of LIMITES_PESO) {
      const total = await Reservation.countDocuments({ ...base, ...lim.filtro });
      const conRecargo = await Reservation.countDocuments({ ...base, ...lim.filtro, totalRecargosEquipo: { $gt: 0 } });
      pesosExcedidos.push({ label: lim.label, total, conRecargo, sinRecargo: total - conRecargo });
    }

    // ── resumen ───────────────────────────────────────────────────────────────
    const totalSinRecargo =
      cpStats.sinRecargo +
      tramosAncho.reduce((s, t) => s + t.sinRecargo, 0);

    const montoNoRecargado =
      (cpStats.montoEsperado - cpStats.montoAplicado) +
      tramosAncho.reduce((s, t) => s + Math.max(0, t.montoEsperado - t.montoAplicado), 0);

    res.json({
      cargaPeligrosa: cpStats,
      sobreancho: tramosAncho,
      pesosExcedidos,
      resumen: {
        totalSinRecargo,
        montoNoRecargado,
        rangos: RANGOS_DIF,
      },
    });
  } catch (e) {
    res.status(500).json({ message: 'Error en análisis', error: e.message });
  }
});

export default router;
