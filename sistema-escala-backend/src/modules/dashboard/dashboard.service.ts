import { pool } from '../../db/mysql';
import type { RowDataPacket } from 'mysql2';

type UserRole = 'VOLUNTEER' | 'COORDINATOR';

// Função auxiliar para executar uma query SQL simples que retorna uma contagem
const getCount = async (sql: string, params: any[] = []): Promise<number> => {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return Number(rows[0].count);
};

/**
 * Busca o resumo para o dashboard do Coordenador
 */
const getCoordinatorSummary = async () => {
  const [activeVolunteers, pendingSchedules] = await Promise.all([
    // Voluntários Ativos
    getCount('SELECT COUNT(*) as count FROM User WHERE status = "ACTIVE" AND userType = "VOLUNTEER"'),
    
    // Escalas com status PENDING
    getCount(`
      SELECT COUNT(DISTINCT scheduleId) as count 
      FROM ScheduleVolunteer 
      WHERE status = 'PENDING'
    `)
    
    // "Confirmações Hoje" é mais complexo, vamos simplificar por enquanto
    // Se quiser, podemos adicionar depois
  ]);

  return {
    activeVolunteers,
    pendingSchedules,
    confirmationsToday: 0 // Placeholder
  };
};

/**
 * Busca o resumo para o dashboard do Voluntário
 */
const getVolunteerSummary = async (userId: number) => {
  const [nextSchedules, pendingConfirmations] = await Promise.all([
    // Próximas escalas (confirmadas ou pendentes, no futuro)
    getCount(`
      SELECT COUNT(*) as count 
      FROM ScheduleVolunteer sv
      JOIN Schedule s ON sv.scheduleId = s.id
      WHERE sv.userId = ? AND s.date >= CURDATE()
    `, [userId]),
    
    // Pendentes de confirmação
    getCount(`
      SELECT COUNT(*) as count 
      FROM ScheduleVolunteer 
      WHERE userId = ? AND status = 'PENDING'
    `, [userId])
  ]);

  return {
    nextSchedules,
    pendingConfirmations
  };
};

/**
 * Ponto de entrada principal do serviço
 */
export const getDashboardSummary = async (userId: number, userRole: UserRole) => {
  if (userRole === 'COORDINATOR') {
    return getCoordinatorSummary();
  } else {
    return getVolunteerSummary(userId);
  }
  
};