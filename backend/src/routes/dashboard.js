import express from 'express';
import Reservation from '../models/Reservation.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [
      total,
      porEstado,
      porRuta,
      porNave,
      porTipoEquipo,
      porMes,
      montos,
    ] = await Promise.all([
      Reservation.countDocuments(),

      Reservation.aggregate([
        { $group: { _id: '$estadoReserva', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),

      Reservation.aggregate([
        { $group: { _id: '$ruta', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 6 },
      ]),

      Reservation.aggregate([
        { $group: { _id: '$nave', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),

      Reservation.aggregate([
        { $group: { _id: '$tipoEquipo', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: 8 },
      ]),

      Reservation.aggregate([
        {
          $group: {
            _id: { $substr: ['$fechaCreacion', 3, 7] },
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      Reservation.aggregate([
        {
          $group: {
            _id: null,
            montoTotal: { $sum: '$totalReserva' },
            montoPagado: { $sum: '$totalPagado' },
            montoDescuentos: { $sum: '$totalDescuentos' },
            montoRecargos: { $sum: '$totalRecargos' },
          },
        },
      ]),
    ]);

    res.json({
      total,
      porEstado,
      porRuta,
      porNave,
      porTipoEquipo,
      porMes,
      montos: montos[0] || {},
    });
  } catch (error) {
    res.status(500).json({ message: 'Error en dashboard', error: error.message });
  }
});

export default router;
