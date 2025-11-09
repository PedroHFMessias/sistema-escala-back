import type { Request, Response } from 'express';
import * as Service from './dashboard.service';

export const getSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // O serviço vai buscar dados diferentes dependendo do role
    const summary = await Service.getDashboardSummary(userId, userRole);
    
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar resumo do dashboard', error: error.message });
  }
};