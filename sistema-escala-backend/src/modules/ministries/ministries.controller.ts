import type { Request, Response } from 'express';
import * as Service from './ministries.service';

// Listar
export const listMinistries = async (req: Request, res: Response) => {
  try {
    const ministries = await Service.listMinistries();
    res.json(ministries);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar ministérios', error: error.message });
  }
};

// Criar
export const createMinistry = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // Validação básica
    if (!data.name || !data.description || !data.color) {
      return res.status(400).json({ message: 'Nome, descrição e cor são obrigatórios.' });
    }
    const newMinistry = await Service.createMinistry(data);
    res.status(201).json(newMinistry);
  } catch (error: any) {
     if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um ministério com esse nome.' });
    }
    res.status(500).json({ message: 'Erro ao criar ministério', error: error.message });
  }
};

// Atualizar
export const updateMinistry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedMinistry = await Service.updateMinistry(Number(id), data);
    res.json(updatedMinistry);
  } catch (error: any) {
    if (error.message === 'Ministério não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar ministério', error: error.message });
  }
};

// Deletar
export const deleteMinistry = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Service.deleteMinistry(Number(id));
    res.status(204).send(); // 204 No Content (Sucesso sem corpo)
  } catch (error: any) {
    if (error.message.startsWith('Não é possível excluir')) { // Pega erro da regra de negócio
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao deletar ministério', error: error.message });
  }
};

// Ativar/Desativar
export const toggleMinistryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'O campo "isActive" (booleano) é obrigatório.' });
    }
    const updatedMinistry = await Service.toggleMinistryStatus(Number(id), isActive);
    res.json(updatedMinistry);
  } catch (error: any) {
     if (error.message === 'Ministério não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar status', error: error.message });
  }
};