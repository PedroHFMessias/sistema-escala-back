import { Router } from 'express';
import { isAuthenticated, isCoordinator } from '../../middleware/auth.middleware';
import * as Controller from './schedules.controller';

const router = Router();

// --- Rotas de Coordenador (Gerenciamento) ---
// Estas rotas vêm de ScheduleManagementPage.tsx

// POST /api/schedules - Criar nova escala
router.post('/', isAuthenticated, isCoordinator, Controller.createSchedule);

// GET /api/schedules - Listar todas as escalas (visão do coordenador)
router.get('/', isAuthenticated, isCoordinator, Controller.listSchedules);

// PUT /api/schedules/:id - Atualizar uma escala
router.put('/:id', isAuthenticated, isCoordinator, Controller.updateSchedule);

// DELETE /api/schedules/:id - Deletar uma escala
router.delete('/:id', isAuthenticated, isCoordinator, Controller.deleteSchedule);

// --- Rotas de Relatório/Visualização (Coordenador ou Todos) ---
// Estas rotas vêm de ScheduleViewPage.tsx e ReportsPage.tsx

// GET /api/schedules/view - Listar escalas "achatadas" para visualização/relatório
router.get('/view', isAuthenticated, Controller.listFlattenedSchedules);

// --- Rotas de Voluntário (Minhas Escalas) ---
// Estas rotas vêm de VolunteerSchedulePage.tsx e VolunteerConfirmationPage.tsx

// GET /api/schedules/my-schedules - Listar apenas as escalas do voluntário logado
router.get('/my-schedules', isAuthenticated, Controller.listMySchedules);

// GET /api/schedules/my-confirmations - Listar apenas as escalas CONFIRMADAS do voluntário
router.get('/my-confirmations', isAuthenticated, Controller.listMyConfirmations);

// PATCH /api/schedules/volunteer/:scheduleVolunteerId/confirm
// Rota para o voluntário confirmar sua presença
router.patch('/volunteer/:scheduleVolunteerId/confirm', isAuthenticated, Controller.confirmSchedule);

// PATCH /api/schedules/volunteer/:scheduleVolunteerId/request-change
// Rota para o voluntário solicitar troca
router.patch('/volunteer/:scheduleVolunteerId/request-change', isAuthenticated, Controller.requestChange);

export default router;