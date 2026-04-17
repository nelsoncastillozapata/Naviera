import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import reservationsRouter from './routes/reservations.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';
import tarifasRouter from './routes/tarifas.js';
import tarifasAplicadasRouter from './routes/tarifas-aplicadas.js';
import analisisRecargosRouter from './routes/analisis-recargos.js';
import analisisDescuentosRouter from './routes/analisis-descuentos.js';
import informeRouter from './routes/informe.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/tarifas', tarifasRouter);
app.use('/api/tarifas-aplicadas', tarifasAplicadasRouter);
app.use('/api/analisis-recargos', analisisRecargosRouter);
app.use('/api/analisis-descuentos', analisisDescuentosRouter);
app.use('/api/informe', informeRouter);
app.use('/api/reservations', reservationsRouter);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API SaaS Naviera funcionando' });
});

const start = async () => {
  await connectDB();
  app.listen(port, () => {
    console.log(`Backend iniciado en http://localhost:${port}`);
  });
};

start();
