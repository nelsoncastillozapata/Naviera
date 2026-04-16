import express from 'express';
import Reservation from '../models/Reservation.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { search, estado } = req.query;
    const query = {};

    if (estado) {
      query.estadoReserva = new RegExp(estado, 'i');
    }
    if (search) {
      query.$or = [
        { clienteNombre: new RegExp(search, 'i') },
        { numeroReserva: new RegExp(search, 'i') },
        { ruta: new RegExp(search, 'i') },
      ];
    }

    const reservations = await Reservation.find(query).limit(200).sort({ fechaCreacion: -1 });
    res.json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar reservas', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    res.json(reservation);
  } catch (error) {
    res.status(500).json({ message: 'Error al cargar la reserva', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const newReservation = new Reservation(req.body);
    const saved = await newReservation.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear reserva', error: error.message });
  }
});

export default router;
