import { Router } from 'express';
import { isAuthenticated, isCoordinator } from '../../middleware/auth.middleware';
import * as Controller from './members.controller';

const router = Router();

// Todas as rotas de membros são protegidas e exclusivas para Coordenadores
router.use(isAuthenticated, isCoordinator);

// GET /api/members - Listar todos os membros (com filtros)
router.get('/', Controller.listMembers);

// POST /api/members - Criar um novo membro
router.post('/', Controller.createMember);

// GET /api/members/:id - Obter dados de um membro específico
router.get('/:id', Controller.getMemberById);

// PUT /api/members/:id - Atualizar um membro
router.put('/:id', Controller.updateMember);

// DELETE /api/members/:id - Deletar um membro
router.delete('/:id', Controller.deleteMember);

// PATCH /api/members/:id/status - Ativar/Desativar um membro
router.patch('/:id/status', Controller.toggleMemberStatus);

export default router;