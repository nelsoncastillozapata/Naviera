import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import reservationsRouter from './routes/reservations.js';
import authRouter from './routes/auth.js';
import dashboardRouter from './routes/dashboard.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
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
