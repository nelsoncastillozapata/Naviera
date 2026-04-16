import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'saas_naviera_secret';

router.post('/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password)
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });

    const existe = await User.findOne({ email });
    if (existe) return res.status(409).json({ message: 'El email ya está registrado' });

    const user = await User.create({ nombre, email, password });
    const token = jwt.sign({ id: user._id, nombre: user.nombre, email: user.email }, SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, user: { id: user._id, nombre: user.nombre, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user._id, nombre: user.nombre, email: user.email }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user._id, nombre: user.nombre, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
});

export default router;
