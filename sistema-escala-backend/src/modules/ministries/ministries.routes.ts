import { Router } from 'express';
import { isAuthenticated, isCoordinator } from '../../middleware/auth.middleware';
import * as Controller from './ministries.controller';

const router = Router();

// --- Rotas Protegidas ---
// Todas as rotas de ministério exigem que o usuário esteja logado
// E também que ele seja um Coordenador.

// GET /api/ministries - Listar todos os ministérios
router.get('/', isAuthenticated, isCoordinator, Controller.listMinistries);

// POST /api/ministries - Criar um novo ministério
router.post('/', isAuthenticated, isCoordinator, Controller.createMinistry);

// PUT /api/ministries/:id - Atualizar um ministério
router.put('/:id', isAuthenticated, isCoordinator, Controller.updateMinistry);

// DELETE /api/ministries/:id - Deletar um ministério
router.delete('/:id', isAuthenticated, isCoordinator, Controller.deleteMinistry);

// PATCH /api/ministries/:id/status - Ativar/Desativar ministério
router.patch('/:id/status', isAuthenticated, isCoordinator, Controller.toggleMinistryStatus);

export default router;