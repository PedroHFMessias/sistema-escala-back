import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import ministryRoutes from './modules/ministries/ministries.routes';
import memberRoutes from './modules/members/members.routes';
import scheduleRoutes from './modules/schedules/schedules.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes'; // <-- 1. Importar

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API Sistema de Escalas rodando! 🚀');
});

// --- Rotas da API ---
app.use('/api/auth', authRoutes);
app.use('/api/ministries', ministryRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/dashboard', dashboardRoutes); // <-- 2. Usar as rotas de dashboard

// ---------------------

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});