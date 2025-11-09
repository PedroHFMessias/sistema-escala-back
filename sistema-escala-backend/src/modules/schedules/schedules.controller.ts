import type { Request, Response } from 'express';
import * as Service from './schedules.service';

// --- Controladores de Coordenador ---

export const createSchedule = async (req: Request, res: Response) => {
  try {
    const data = req.body; // Espera { date, time, type, ministryId, notes, volunteerIds: [...] }
    const newSchedule = await Service.createSchedule(data);
    res.status(201).json(newSchedule);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao criar escala', error: error.message });
  }
};

export const listSchedules = async (req: Request, res: Response) => {
  try {
    const schedules = await Service.listSchedules();
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao listar escalas', error: error.message });
  }
};

export const updateSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const updatedSchedule = await Service.updateSchedule(Number(id), data);
    res.json(updatedSchedule);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao atualizar escala', error: error.message });
  }
};

export const deleteSchedule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Service.deleteSchedule(Number(id));
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao deletar escala', error: error.message });
  }
};

// --- Controladores de Voluntário ---

export const listMySchedules = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id; // Sabemos que o usuário existe por causa do middleware
    const schedules = await Service.listMySchedules(userId);
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar minhas escalas', error: error.message });
  }
};

export const listMyConfirmations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const schedules = await Service.listMySchedules(userId, 'CONFIRMED');
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao buscar minhas confirmações', error: error.message });
  }
};

export const confirmSchedule = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { scheduleVolunteerId } = req.params;
    
    const updated = await Service.updateScheduleStatus(
      Number(scheduleVolunteerId),
      userId,
      'CONFIRMED'
    );
    res.json(updated);
  } catch (error: any) { // <-- { FALTAVA A CHAVE AQUI
    if (error.message === 'Acesso negado') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao confirmar escala', error: error.message });
  } // <-- } FALTAVA A CHAVE AQUI
};

export const requestChange = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { scheduleVolunteerId } = req.params;
    const { justificationMessage } = req.body; // Vem do modal

    const updated = await Service.updateScheduleStatus(
      Number(scheduleVolunteerId),
      userId,
      'EXCHANGE_REQUESTED',
      justificationMessage
    );
    res.json(updated);
  } catch (error: any) { // <-- { FALTAVA A CHAVE AQUI
     if (error.message === 'Acesso negado') {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao solicitar troca', error: error.message });
  } // <-- } FALTAVA A CHAVE AQUI
};


// --- Controlador de Visualização/Relatório ---

export const listFlattenedSchedules = async (req: Request, res: Response) => {
   try {
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      ministryId: req.query.ministryId as string | undefined,
    };
    const schedules = await Service.listFlattenedSchedules(filters);
    res.json(schedules);
  } catch (error: any) {
    res.status(500).json({ message: 'Erro ao visualizar escalas', error: error.message });
  }
};