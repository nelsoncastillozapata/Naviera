import express from 'express';
import Reservation from '../models/Reservation.js';

const router = express.Router();

const mesKey = (zarpe) => {
  const m = zarpe?.match(/^(\d{2})-(\d{2})-(\d{4})/);
  return m ? `${m[3]}-${m[2]}` : null;
};

const mesAnterior = (key) => {
  if (!key) return null;
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const volumeTier = (eq) => {
  if (eq <= 10)  return { tier: 1, label: '1–10 equipos',    color: '#94a3b8' };
  if (eq <= 30)  return { tier: 2, label: '11–30 equipos',   color: '#60a5fa' };
  if (eq <= 60)  return { tier: 3, label: '31–60 equipos',   color: '#34d399' };
  if (eq <= 100) return { tier: 4, label: '61–100 equipos',  color: '#f59e0b' };
  if (eq <= 200) return { tier: 5, label: '101–200 equipos', color: '#f97316' };
  return           { tier: 6, label: '200+ equipos',         color: '#8b5cf6' };
};

router.get('/', async (req, res) => {
  try {
    // Agrupar por cliente + mes
    const clienteMes = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada', 'Pagada'] }, totalRackEquipo: { $gt: 0 } } },
      { $addFields: {
          mes: { $substr: ['$fechaZarpe', 3, 7] },
          pctDesc: { $cond: [
            { $gt: ['$totalRackEquipo', 0] },
            { $multiply: [{ $divide: ['$totalDescuentosEquipo', '$totalRackEquipo'] }, 100] },
            0
          ]}
      }},
      { $group: {
          _id: { cliente: '$identificacionCliente', mes: '$mes' },
          nombre: { $first: '$clienteNombre' },
          equipos: { $sum: 1 },
          montoRack:  { $sum: '$totalRackEquipo' },
          montoDesc:  { $sum: '$totalDescuentosEquipo' },
          pctDescMin: { $min: '$pctDesc' },
          pctDescMax: { $max: '$pctDesc' },
          pctDescAvg: { $avg: '$pctDesc' },
          tasasDistintas: { $addToSet: { $round: ['$pctDesc', 1] } }
      }},
      { $addFields: { variacion: { $subtract: ['$pctDescMax', '$pctDescMin'] } } },
      { $sort: { '_id.cliente': 1, '_id.mes': 1 } }
    ]);

    // Índice por cliente para correlación
    const porCliente = {};
    for (const cm of clienteMes) {
      const k = cm._id.cliente;
      if (!porCliente[k]) porCliente[k] = [];
      porCliente[k].push({ mes: cm._id.mes, equipos: cm.equipos, pctDesc: cm.pctDescAvg, nombre: cm.nombre, variacion: cm.variacion });
    }

    // ── A. Consistencia interna (misma tasa todo el mes) ────────────────────
    const consistencia = { ok: 0, leve: 0, alta: 0 };
    for (const cm of clienteMes) {
      if (cm.variacion <= 2)       consistencia.ok++;
      else if (cm.variacion <= 10) consistencia.leve++;
      else                         consistencia.alta++;
    }

    // ── B. Correlación volumen mes anterior → descuento mes actual ──────────
    let correcto = 0, incorrecto = 0;
    const casosIncorrectos = [];
    const tierStats = {};

    for (const [, meses] of Object.entries(porCliente)) {
      const ord = meses.sort((a, b) => {
        const [ma, ya] = a.mes.split('-'); const [mb, yb] = b.mes.split('-');
        return `${ya}${ma}` > `${yb}${mb}` ? 1 : -1;
      });
      for (let i = 1; i < ord.length; i++) {
        const prev = ord[i - 1];
        const curr = ord[i];
        const tier = volumeTier(prev.equipos);
        if (!tierStats[tier.tier]) tierStats[tier.tier] = { ...tier, correcto: 0, incorrecto: 0, totalTransiciones: 0 };
        tierStats[tier.tier].totalTransiciones++;

        const deltaVol = curr.equipos - prev.equipos;
        const deltaDes = curr.pctDesc  - prev.pctDesc;
        const volSubio = deltaVol >  prev.equipos * 0.20;
        const volBajo  = deltaVol < -prev.equipos * 0.20;
        const descSubio = deltaDes >  2;
        const descBajo  = deltaDes < -2;

        let ok = true;
        let motivo = '';
        if (volSubio && descBajo)  { ok = false; motivo = 'Volumen subió >20% pero descuento bajó'; }
        if (volBajo  && descSubio) { ok = false; motivo = 'Volumen bajó >20% pero descuento subió'; }

        if (ok) { correcto++; tierStats[tier.tier].correcto++; }
        else {
          incorrecto++; tierStats[tier.tier].incorrecto++;
          if (casosIncorrectos.length < 50) {
            casosIncorrectos.push({
              cliente: curr.nombre,
              mes: curr.mes,
              equiposAnterior: prev.equipos,
              equiposActual: curr.equipos,
              descAnterior: Math.round(prev.pctDesc * 10) / 10,
              descActual: Math.round(curr.pctDesc * 10) / 10,
              motivo,
            });
          }
        }
      }
    }

    // ── C. Distribución % descuento aplicado vs volumen tier ────────────────
    const descPorTier = {};
    for (const cm of clienteMes) {
      const t = volumeTier(cm.equipos);
      if (!descPorTier[t.tier]) descPorTier[t.tier] = { ...t, count: 0, pctDescSum: 0, pctDescList: [] };
      descPorTier[t.tier].count++;
      descPorTier[t.tier].pctDescSum += cm.pctDescAvg;
      if (descPorTier[t.tier].pctDescList.length < 200) descPorTier[t.tier].pctDescList.push(Math.round(cm.pctDescAvg * 10) / 10);
    }

    const tierResumen = Object.values(descPorTier).map(t => ({
      tier:    t.tier,
      label:   t.label,
      color:   t.color,
      count:   t.count,
      pctDescPromedio: t.count ? Math.round((t.pctDescSum / t.count) * 10) / 10 : 0,
    })).sort((a, b) => a.tier - b.tier);

    // ── D. Resumen rangos de inconsistencia (cantidad por variación) ─────────
    const rangoConsistencia = [
      { id: 'ok',   label: 'Tasa uniforme (var. ≤2%)',     cantidad: consistencia.ok   },
      { id: 'leve', label: 'Variación leve 2–10%',         cantidad: consistencia.leve },
      { id: 'alta', label: 'Variación alta >10%',          cantidad: consistencia.alta },
    ];

    res.json({
      totalClienteMes: clienteMes.length,
      correcto,
      incorrecto,
      rangoConsistencia,
      casosIncorrectos,
      tierResumen,
      tierStats: Object.values(tierStats).sort((a, b) => a.tier - b.tier),
    });
  } catch (e) {
    res.status(500).json({ message: 'Error análisis descuentos', error: e.message });
  }
});

export default router;
