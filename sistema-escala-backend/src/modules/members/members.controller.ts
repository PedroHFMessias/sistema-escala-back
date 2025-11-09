import type { Request, Response } from 'express';
import * as Service from './members.service';

// Listar membros com filtros
export const listMembers = async (req: Request, res: Response) => {
  try {
    // Pegamos os filtros da query string (ex: /api/members?search=Maria&userType=VOLUNTEER)
    const filters = {
      search: req.query.search as string | undefined,
      userType: req.query.userType as 'COORDINATOR' | 'VOLUNTEER' | undefined,
      ministryId: req.query.ministryId as string | undefined,
    };
    const members = await Service.listMembers(filters);
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao listar membros', error: error.message });
  }
};

// Obter um membro por ID
export const getMemberById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const member = await Service.getMemberById(Number(id));
    if (!member) {
      return res.status(404).json({ message: 'Membro não encontrado' });
    }
    res.json(member);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar membro', error: error.message });
  }
};

// Criar novo membro
export const createMember = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Validação básica (o frontend já valida, mas é bom ter no backend)
    if (!data.name || !data.email || !data.password || !data.cpf || !data.rg || !data.ministries) {
      return res.status(400).json({ message: 'Campos obrigatórios ausentes.' });
    }

    const newMember = await Service.createMember(data);
    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email, CPF ou RG já cadastrado.' });
    }
    res.status(500).json({ message: 'Erro ao criar membro', error: error.message });
  }
};

// Atualizar membro
export const updateMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedMember = await Service.updateMember(Number(id), data);
    res.json(updatedMember);
  } catch (error: any) {
    if (error.message === 'Membro não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar membro', error: error.message });
  }
};

// Deletar membro
export const deleteMember = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Service.deleteMember(Number(id));
    res.status(204).send(); // Sucesso, sem conteúdo
  } catch (error: any) {
    if (error.message === 'Membro não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    // Adicionar verificação de escalas
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
       return res.status(400).json({ message: 'Não é possível excluir um membro que já está em uma escala.' });
    }
    res.status(500).json({ message: 'Erro ao deletar membro', error: error.message });
  }
};

// Ativar/Desativar status
export const toggleMemberStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Espera 'ACTIVE' ou 'INACTIVE'
     if (!status || (status !== 'ACTIVE' && status !== 'INACTIVE')) {
      return res.status(400).json({ message: 'O campo "status" ("ACTIVE" ou "INACTIVE") é obrigatório.' });
    }
    const updatedMember = await Service.toggleMemberStatus(Number(id), status);
    res.json(updatedMember);
  } catch (error: any) {
     if (error.message === 'Membro não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar status', error: error.message });
  }
};