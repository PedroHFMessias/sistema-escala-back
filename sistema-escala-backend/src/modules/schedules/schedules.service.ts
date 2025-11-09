import { pool } from '../../db/mysql';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// --- Interfaces ---
interface ScheduleInput {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
  type: string;
  ministryId: number;
  notes?: string;
  volunteerIds: number[]; // Array de IDs de usuários
}

type ScheduleStatus = 'PENDING' | 'CONFIRMED' | 'EXCHANGE_REQUESTED';

// --- Funções Auxiliares ---

/**
 * Busca uma escala completa (visão do coordenador)
 */
const fetchScheduleById = async (id: number) => {
  const [scheduleRows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM Schedule WHERE id = ?',
    [id]
  );
  if (scheduleRows.length === 0) return null;
  const schedule = scheduleRows[0];

  // Busca os voluntários associados
  const [volunteerRows] = await pool.query<RowDataPacket[]>(`
    SELECT 
      sv.id as scheduleVolunteerId, 
      sv.status, 
      sv.requestedChangeReason,
      u.id as userId,
      u.name
    FROM ScheduleVolunteer sv
    JOIN User u ON sv.userId = u.id
    WHERE sv.scheduleId = ?
  `, [id]);
  
  schedule.volunteers = volunteerRows;
  return schedule;
};


// --- Serviços de Coordenador ---

export const createSchedule = async (data: ScheduleInput) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Criar a Escala (Schedule)
    const [scheduleResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO Schedule (date, time, type, ministryId, notes) VALUES (?, ?, ?, ?, ?)',
      [data.date, data.time, data.type, data.ministryId, data.notes]
    );
    const newScheduleId = scheduleResult.insertId;

    // 2. Vincular os Voluntários (ScheduleVolunteer)
    if (data.volunteerIds && data.volunteerIds.length > 0) {
      const volunteerValues = data.volunteerIds.map(userId => [newScheduleId, userId]);
      await connection.query(
        'INSERT INTO ScheduleVolunteer (scheduleId, userId) VALUES ?',
        [volunteerValues]
      );
    }
    
    await connection.commit();
    return fetchScheduleById(newScheduleId);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const listSchedules = async () => {
  // Lista todas as escalas e usa JSON_ARRAYAGG para agrupar os voluntários
  const [rows] = await pool.query(`
    SELECT 
      s.*,
      m.name as ministryName,
      m.color as ministryColor,
      (SELECT 
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'scheduleVolunteerId', sv.id, 
             'userId', u.id, 
             'name', u.name, 
             'status', sv.status
            )
         )
       FROM ScheduleVolunteer sv
       JOIN User u ON sv.userId = u.id
       WHERE sv.scheduleId = s.id
      ) as volunteers
    FROM Schedule s
    JOIN Ministry m ON s.ministryId = m.id
    ORDER BY s.date DESC, s.time ASC
  `);
  return rows;
};

export const updateSchedule = async (id: number, data: ScheduleInput) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Atualizar a Escala (Schedule)
    await connection.query(
      'UPDATE Schedule SET date = ?, time = ?, type = ?, ministryId = ?, notes = ? WHERE id = ?',
      [data.date, data.time, data.type, data.ministryId, data.notes, id]
    );

    // 2. Atualizar os Voluntários (Apaga os antigos e insere os novos)
    await connection.query('DELETE FROM ScheduleVolunteer WHERE scheduleId = ?', [id]);
    
    if (data.volunteerIds && data.volunteerIds.length > 0) {
      const volunteerValues = data.volunteerIds.map(userId => [id, userId]);
      await connection.query(
        'INSERT INTO ScheduleVolunteer (scheduleId, userId) VALUES ?',
        [volunteerValues]
      );
    }
    
    await connection.commit();
    return fetchScheduleById(id);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteSchedule = async (id: number) => {
  // O SQL foi configurado com 'ON DELETE CASCADE' para ScheduleVolunteer,
  // então ao deletar a escala, os vínculos são deletados automaticamente.
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM Schedule WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new Error('Escala não encontrada');
  }
};

// --- Serviços de Voluntário ---

export const listMySchedules = async (userId: number, status?: ScheduleStatus) => {
  let query = `
    SELECT 
      s.date, s.time, s.type, s.notes,
      m.name as ministry,
      sv.id as scheduleVolunteerId,
      sv.status,
      sv.requestedChangeReason
    FROM ScheduleVolunteer sv
    JOIN Schedule s ON sv.scheduleId = s.id
    JOIN Ministry m ON s.ministryId = m.id
    WHERE sv.userId = ?
  `;
  const params: any[] = [userId];

  if (status) {
    query += ' AND sv.status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY s.date ASC, s.time ASC';

  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
};

export const updateScheduleStatus = async (
  scheduleVolunteerId: number,
  userId: number,
  status: ScheduleStatus,
  reason?: string
) => {
  // Atualiza o status
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE ScheduleVolunteer SET status = ?, requestedChangeReason = ? WHERE id = ? AND userId = ?',
    [status, reason || null, scheduleVolunteerId, userId]
  );
  
  // Verifica se a atualização funcionou e se o usuário tinha permissão
  if (result.affectedRows === 0) {
    throw new Error('Acesso negado ou escala não encontrada.');
  }
  
  // Retorna o item atualizado
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM ScheduleVolunteer WHERE id = ?', [scheduleVolunteerId]);
  return rows[0];
};

// --- Serviço de Visualização/Relatório ---

export const listFlattenedSchedules = async (filters: any) => {
  let query = `
    SELECT 
      s.id, s.date, s.time, s.type, 
      m.name as ministry,
      u.name as volunteer,
      sv.status
    FROM ScheduleVolunteer sv
    JOIN Schedule s ON sv.scheduleId = s.id
    JOIN User u ON sv.userId = u.id
    JOIN Ministry m ON s.ministryId = m.id
  `;
  const params: any[] = [];
  const whereClauses: string[] = [];

  if (filters.search) {
    whereClauses.push(`(u.name LIKE ? OR s.type LIKE ?)`);
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.status && filters.status !== 'todos') {
    whereClauses.push(`sv.status = ?`);
    params.push(filters.status);
  }
  if (filters.ministryId && filters.ministryId !== 'Todos') {
    whereClauses.push(`s.ministryId = ?`);
    params.push(Number(filters.ministryId));
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  query += ' ORDER BY s.date DESC, s.time ASC, u.name ASC';

  const [rows] = await pool.query(query, params);
  return rows;
};