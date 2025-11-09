import { Router } from 'express';
import { isAuthenticated } from '../../middleware/auth.middleware';
import * as Controller from './dashboard.controller';

const router = Router();

// Rota GET /api/dashboard/summary
// Protegida, pois só usuários logados podem ver
router.get('/summary', isAuthenticated, Controller.getSummary);

export default router;