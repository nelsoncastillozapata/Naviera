import express from 'express';
import Reservation from '../models/Reservation.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require   = createRequire(import.meta.url);
const XLSX      = require('xlsx');
const router    = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE      = path.resolve(__dirname, '../../../Datos/Tarifas_2024_2025.xlsx');

const mesKey    = (z) => { const m = z?.match(/^(\d{2})-(\d{2})-(\d{4})/); return m ? `${m[3]}-${m[2]}` : null; };
const mapRuta   = (r) => ({ PMCNAT:'Natales', NATPMC:'Natales', PMCUCO:'Chacabuco', UCOPMC:'Chacabuco' }[r?.toUpperCase()] ?? null);
const esRetorno = (r) => ['NATPMC','UCOPMC'].includes(r?.toUpperCase());

const mapItem = (tipo, mli) => {
  if (!tipo) return null;
  const t = tipo.toUpperCase();
  if (/MOTO/.test(t)) return { item: 'Motos', usaMli: false };
  if (/VEHÍCULO|VEHICULO|AUTOMOVIL|CAMIONETA|JEEP|VAN/.test(t)) return { item: 'Vehículos Menores', usaMli: false };
  if (/MAQUINARIA|HORQUILLA|CARRO PLANO|CASSETTE/.test(t)) return { item: 'Maquinarias', usaMli: false };
  if (/FURGON|FURGÓN/.test(t)) return { item: 'Furgones', usaMli: true };
  if (/ARTICULADO/.test(t) || (parseFloat(mli) || 0) >= 16.5) return { item: 'Camiones Articulados', usaMli: true };
  if (/CAMION|CAMIÓN|SEMI|RAMPLA|RAMPA|BUS|CARRO/.test(t)) return { item: 'Camiones/Buses/Carros/Semirremolques', usaMli: true };
  return null;
};

const matchLargo = (largos, mli) => {
  const m = parseFloat(mli) || 0;
  for (const l of largos) {
    if (!l) return true;
    const s = l.toLowerCase();
    if (s.includes('hasta') && !s.includes('desde')) { const max = parseFloat(s.replace(',','.').match(/[\d.]+/)?.[0])||0; if (m <= max) return l; }
    if (s.includes('desde') && s.includes('a'))      { const [mn,mx] = s.replace(',','.').match(/[\d.]+/g).map(Number); if (m >= mn && m <= mx) return l; }
    if (s.startsWith('desde') && !s.includes('a'))   { const mn = parseFloat(s.replace(',','.').match(/[\d.]+/)?.[0])||0; if (m >= mn) return l; }
  }
  return null;
};

let tarifasCache = null;
const getTarifas = () => {
  if (tarifasCache) return tarifasCache;
  const wb = XLSX.readFile(FILE);
  const ws = wb.Sheets[wb.SheetNames[0]];
  tarifasCache = XLSX.utils.sheet_to_json(ws, { defval: null }).map(r => ({
    periodo: r.Periodo, ruta: r.Ruta, item: r.Item_Cobro, largos: r.Largos,
    unidad: r.Unidad_Cobro, destino: r.P_Montt_a_Destino, retCarg: r.Retorno_Cargado, retVacio: r.Retorno_Vacio,
  }));
  return tarifasCache;
};

router.get('/', async (req, res) => {
  try {
    const tarifas = getTarifas();

    const facturadas = await Reservation.find({
      estadoReserva: { $in: ['Facturada', 'Pagada'] },
      totalRackEquipo: { $gt: 0 }
    }).select('ruta tipoEquipo equipoMli equipoAncho equipoPeso totalRackEquipo totalDescuentosEquipo totalRecargosEquipo tipoCarga fechaZarpe identificacionCliente clienteNombre').lean();

    // ── KPIs base ─────────────────────────────────────────────────────────────
    const [kpiBase] = await Reservation.aggregate([{ $group: { _id: null,
      total:        { $sum: 1 },
      montoReserva: { $sum: '$totalReserva' },
      montoPagado:  { $sum: '$totalPagado' },
      montoDesc:    { $sum: '$totalDescuentos' },
      montoRecargos:{ $sum: '$totalRecargos' },
      facturadas:   { $sum: { $cond: [{ $eq: ['$estadoReserva','Facturada'] }, 1, 0] } },
      pagadas:      { $sum: { $cond: [{ $eq: ['$estadoReserva','Pagada'] }, 1, 0] } },
      anuladas:     { $sum: { $cond: [{ $eq: ['$estadoReserva','Anulada'] }, 1, 0] } },
      tentativas:   { $sum: { $cond: [{ $eq: ['$estadoReserva','Tentativa'] }, 1, 0] } },
      montoRack:    { $sum: '$totalRackEquipo' },
    }}]);

    const porRuta = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada','Pagada'] } } },
      { $group: { _id: '$ruta', cnt: { $sum: 1 }, monto: { $sum: '$totalRackEquipo' }, descuentos: { $sum: '$totalDescuentosEquipo' }, recargos: { $sum: '$totalRecargosEquipo' } } },
      { $sort: { cnt: -1 } }
    ]);

    const porNave = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada','Pagada'] } } },
      { $group: { _id: '$nave', cnt: { $sum: 1 }, monto: { $sum: '$totalRackEquipo' } } },
      { $sort: { cnt: -1 } }
    ]);

    const porMes = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada','Pagada'] } } },
      { $addFields: { mes: { $substr: ['$fechaZarpe', 3, 7] } } },
      { $group: { _id: '$mes', cnt: { $sum: 1 }, monto: { $sum: '$totalRackEquipo' } } },
      { $sort: { _id: 1 } }
    ]);

    // ── Cumplimiento tarifas ──────────────────────────────────────────────────
    let tarifa_ok=0, tarifa_dif_pos=0, tarifa_dif_neg=0, tarifa_sin=0;
    let monto_subcobro=0, monto_sobrecobro=0;
    const detallesTarifas = [];

    for (const r of facturadas) {
      const rt = mapRuta(r.ruta);
      const it = mapItem(r.tipoEquipo, r.equipoMli);
      const per = mesKey(r.fechaZarpe);
      if (!rt || !it || !per) { tarifa_sin++; continue; }
      const cands = tarifas.filter(t => t.periodo === per && t.ruta === rt && t.item === it.item);
      if (!cands.length) { tarifa_sin++; continue; }
      const lm = matchLargo(cands.map(c => c.largos), r.equipoMli);
      const tf = cands.find(c => !c.largos || c.largos === lm);
      if (!tf) { tarifa_sin++; continue; }
      const ret = esRetorno(r.ruta);
      const precioBase = ret ? (tf.retCarg ?? tf.retVacio) : tf.destino;
      if (!precioBase) { tarifa_sin++; continue; }
      const esperado = tf.unidad === 'Metro Lineal' ? precioBase * (parseFloat(r.equipoMli) || 0) : precioBase;
      if (!esperado) { tarifa_sin++; continue; }
      const dif = ((r.totalRackEquipo - esperado) / esperado) * 100;
      if (Math.abs(dif) <= 1) {
        tarifa_ok++;
      } else if (dif > 1) {
        tarifa_dif_pos++;
        monto_sobrecobro += r.totalRackEquipo - esperado;
        if (detallesTarifas.length < 20) detallesTarifas.push({ cliente: r.clienteNombre, tipo: r.tipoEquipo, ruta: r.ruta, aplicado: r.totalRackEquipo, esperado, dif: Math.round(dif*10)/10 });
      } else {
        tarifa_dif_neg++;
        monto_subcobro += esperado - r.totalRackEquipo;
      }
    }
    const tarifa_total_match = tarifa_ok + tarifa_dif_pos + tarifa_dif_neg;
    const tarifa_score = tarifa_total_match > 0 ? Math.round((tarifa_ok / tarifa_total_match) * 100) : 0;

    // ── Cumplimiento recargos carga peligrosa ─────────────────────────────────
    const cp_total   = facturadas.filter(r => r.tipoCarga === 'CARGA PELIGROSA').length;
    const cp_con_rec = facturadas.filter(r => r.tipoCarga === 'CARGA PELIGROSA' && (r.totalRecargosEquipo ?? 0) > 0).length;
    const cp_sin_rec = cp_total - cp_con_rec;
    const cp_score   = cp_total > 0 ? Math.round((cp_con_rec / cp_total) * 100) : 100;
    const cp_monto_esperado = facturadas
      .filter(r => r.tipoCarga === 'CARGA PELIGROSA')
      .reduce((s, r) => s + r.totalRackEquipo * 0.20, 0);
    const cp_monto_aplicado = facturadas
      .filter(r => r.tipoCarga === 'CARGA PELIGROSA')
      .reduce((s, r) => s + (r.totalRecargosEquipo ?? 0), 0);

    // ── Cumplimiento recargos sobreancho ──────────────────────────────────────
    let sa_debe=0, sa_tiene=0, sa_monto_esperado=0, sa_monto_aplicado=0;
    for (const r of facturadas) {
      const a = parseFloat(r.equipoAncho) || 0;
      if (a < 2.6) continue;
      const pct = a <= 3.0 ? 0.50 : a <= 4.0 ? 1.00 : 2.00;
      sa_debe++;
      sa_monto_esperado += r.totalRackEquipo * pct;
      sa_monto_aplicado += r.totalRecargosEquipo ?? 0;
      if ((r.totalRecargosEquipo ?? 0) > 0) sa_tiene++;
    }
    const sa_score = sa_debe > 0 ? Math.round((sa_tiene / sa_debe) * 100) : 100;

    // ── Análisis descuentos ───────────────────────────────────────────────────
    const clienteMes = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada','Pagada'] }, totalRackEquipo: { $gt: 0 } } },
      { $addFields: {
        mes: { $substr: ['$fechaZarpe', 3, 7] },
        pctDesc: { $cond: [{ $gt: ['$totalRackEquipo', 0] }, { $multiply: [{ $divide: ['$totalDescuentosEquipo', '$totalRackEquipo'] }, 100] }, 0] }
      }},
      { $group: {
        _id: { c: '$identificacionCliente', m: '$mes' },
        eq: { $sum: 1 },
        pd_min: { $min: '$pctDesc' },
        pd_max: { $max: '$pctDesc' },
        pd_avg: { $avg: '$pctDesc' },
        cliente: { $first: '$clienteNombre' }
      }},
      { $sort: { '_id.m': 1, '_id.c': 1 } }
    ]);

    let desc_ok=0, desc_var_leve=0, desc_var_alta=0;
    const mesesPorCliente = {};
    for (const cm of clienteMes) {
      const varianza = cm.pd_max - cm.pd_min;
      if (varianza <= 2) desc_ok++;
      else if (varianza <= 10) desc_var_leve++;
      else desc_var_alta++;
      const cid = cm._id.c;
      if (!mesesPorCliente[cid]) mesesPorCliente[cid] = [];
      mesesPorCliente[cid].push({ mes: cm._id.m, eq: cm.eq, pd_avg: cm.pd_avg });
    }

    let trans_ok=0, trans_mal=0;
    for (const meses of Object.values(mesesPorCliente)) {
      meses.sort((a,b) => a.mes.localeCompare(b.mes));
      for (let i=1; i<meses.length; i++) {
        const prev = meses[i-1], curr = meses[i];
        const dEq  = prev.eq > 0 ? (curr.eq - prev.eq) / prev.eq : 0;
        const dDes = Math.abs(prev.pd_avg) > 0.1 ? curr.pd_avg - prev.pd_avg : 0;
        if (Math.abs(dEq) < 0.20) continue;
        if ((dEq > 0 && dDes >= 0) || (dEq < 0 && dDes <= 0)) trans_ok++;
        else trans_mal++;
      }
    }

    const desc_total = desc_ok + desc_var_leve + desc_var_alta;
    const desc_consist_score = desc_total > 0 ? Math.round((desc_ok / desc_total) * 100) : 100;
    const trans_total = trans_ok + trans_mal;
    const desc_corr_score = trans_total > 0 ? Math.round((trans_ok / trans_total) * 100) : 100;
    const desc_score = Math.round((desc_consist_score + desc_corr_score) / 2);

    // ── Scores globales ───────────────────────────────────────────────────────
    const UMBRALES = { tarifas: 90, cargaPeligrosa: 95, sobreancho: 80, descuentos: 85 };
    const scores = {
      tarifas:       { score: tarifa_score,    umbral: UMBRALES.tarifas,       cumple: tarifa_score    >= UMBRALES.tarifas },
      cargaPeligrosa:{ score: cp_score,         umbral: UMBRALES.cargaPeligrosa,cumple: cp_score         >= UMBRALES.cargaPeligrosa },
      sobreancho:    { score: sa_score,         umbral: UMBRALES.sobreancho,    cumple: sa_score         >= UMBRALES.sobreancho },
      descuentos:    { score: desc_score,       umbral: UMBRALES.descuentos,    cumple: desc_score       >= UMBRALES.descuentos },
    };
    const scoreGlobal = Math.round(Object.values(scores).reduce((s,v) => s + v.score, 0) / Object.keys(scores).length);

    // ── Concentración clientes (HHI proxy) ───────────────────────────────────
    const topClientes = await Reservation.aggregate([
      { $match: { estadoReserva: { $in: ['Facturada','Pagada'] } } },
      { $group: { _id: '$clienteNombre', cnt: { $sum: 1 }, monto: { $sum: '$totalRackEquipo' } } },
      { $sort: { monto: -1 } }, { $limit: 10 }
    ]);
    const montoTotal = topClientes.reduce((s,c) => s + c.monto, 0) || 1;
    const top3pct = topClientes.slice(0,3).reduce((s,c) => s + c.monto, 0) / montoTotal * 100;

    res.json({
      generadoEn: new Date().toISOString(),
      scoreGlobal,
      scores,

      kpiBase: {
        total:         kpiBase?.total ?? 0,
        facturadas:    kpiBase?.facturadas ?? 0,
        pagadas:       kpiBase?.pagadas ?? 0,
        anuladas:      kpiBase?.anuladas ?? 0,
        tentativas:    kpiBase?.tentativas ?? 0,
        montoReserva:  kpiBase?.montoReserva ?? 0,
        montoPagado:   kpiBase?.montoPagado ?? 0,
        montoRack:     kpiBase?.montoRack ?? 0,
        montoDesc:     kpiBase?.montoDesc ?? 0,
        montoRecargos: kpiBase?.montoRecargos ?? 0,
      },

      tarifas: {
        total:        facturadas.length,
        matcheadas:   tarifa_total_match,
        sinTarifa:    tarifa_sin,
        ok:           tarifa_ok,
        difPos:       tarifa_dif_pos,
        difNeg:       tarifa_dif_neg,
        score:        tarifa_score,
        montoSubcobro:   Math.round(monto_subcobro),
        montoSobrecobro: Math.round(monto_sobrecobro),
        detalles:     detallesTarifas,
      },

      cargaPeligrosa: {
        total:          cp_total,
        conRecargo:     cp_con_rec,
        sinRecargo:     cp_sin_rec,
        score:          cp_score,
        montoEsperado:  Math.round(cp_monto_esperado),
        montoAplicado:  Math.round(cp_monto_aplicado),
        montoNoAplicado: Math.round(cp_monto_esperado - cp_monto_aplicado),
      },

      sobreancho: {
        total:          sa_debe,
        conRecargo:     sa_tiene,
        sinRecargo:     sa_debe - sa_tiene,
        score:          sa_score,
        montoEsperado:  Math.round(sa_monto_esperado),
        montoAplicado:  Math.round(sa_monto_aplicado),
        montoNoAplicado: Math.round(sa_monto_esperado - sa_monto_aplicado),
      },

      descuentos: {
        totalClienteMes: desc_total,
        consistentes:    desc_ok,
        varLeve:         desc_var_leve,
        varAlta:         desc_var_alta,
        consistScore:    desc_consist_score,
        transTotal:      trans_total,
        transOk:         trans_ok,
        transMal:        trans_mal,
        corrScore:       desc_corr_score,
        score:           desc_score,
      },

      operacional: {
        porRuta:    porRuta.map(r => ({ ruta: r._id, cnt: r.cnt, monto: r.monto, descuentos: r.descuentos, recargos: r.recargos })),
        porNave:    porNave.map(r => ({ nave: r._id, cnt: r.cnt, monto: r.monto })),
        porMes:     porMes.map(r => ({ mes: r._id, cnt: r.cnt, monto: r.monto })),
        topClientes: topClientes.map(c => ({ cliente: c._id, cnt: c.cnt, monto: c.monto, pct: Math.round(c.monto/montoTotal*1000)/10 })),
        concentracionTop3pct: Math.round(top3pct * 10) / 10,
      },
    });
  } catch (err) {
    console.error('Error informe:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
