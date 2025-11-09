import { pool } from '../../db/mysql';
import type { RowDataPacket } from 'mysql2';

interface MinistryData {
  name: string;
  description: string;
  color: string;
}

interface Ministry extends RowDataPacket {
  id: number;
  name: string;
  description: string;
  color: string;
  isActive: boolean;
  membersCount: number; // Vem da nossa query customizada
}

// Lista ministérios e CONTA quantos membros estão associados
export const listMinistries = async () => {
  const [rows] = await pool.query<Ministry[]>(`
    SELECT 
      m.*, 
      (SELECT COUNT(*) FROM MinistriesOnUsers mou WHERE mou.ministryId = m.id) AS membersCount
    FROM Ministry m
    ORDER BY m.name
  `);
  // Converte o BigInt 'membersCount' do MySQL para Number
  return rows.map(row => ({
    ...row,
    membersCount: Number(row.membersCount)
  }));
};

// Cria um novo ministério
export const createMinistry = async (data: MinistryData) => {
  const [result] = await pool.query(
    'INSERT INTO Ministry (name, description, color) VALUES (?, ?, ?)',
    [data.name, data.description, data.color]
  );
  const insertId = (result as any).insertId;
  const [rows] = await pool.query<Ministry[]>('SELECT * FROM Ministry WHERE id = ?', [insertId]);
  return rows[0];
};

// Atualiza um ministério
export const updateMinistry = async (id: number, data: Partial<MinistryData>) => {
  // Constrói a query de atualização dinamicamente (para o caso de atualizar só nome, só cor, etc)
  const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
  const values = Object.values(data);
  
  if (fields.length === 0) {
     const [rows] = await pool.query<Ministry[]>('SELECT * FROM Ministry WHERE id = ?', [id]);
     return rows[0];
  }

  await pool.query(`UPDATE Ministry SET ${fields} WHERE id = ?`, [...values, id]);
  
  const [rows] = await pool.query<Ministry[]>('SELECT * FROM Ministry WHERE id = ?', [id]);
  if (rows.length === 0) {
    throw new Error('Ministério não encontrado');
  }
  return rows[0];
};

// Deleta um ministério
export const deleteMinistry = async (id: number) => {
  // Regra de negócio: Não permitir exclusão se houver membros vinculados
  // (Igual ao seu frontend em MinistryManagementePage.tsx)
  const [countRows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM MinistriesOnUsers WHERE ministryId = ?', [id]);
  const memberCount = Number(countRows[0].count);

  if (memberCount > 0) {
    throw new Error('Não é possível excluir um ministério que possui membros vinculados.');
  }

  // Se não tiver membros, deleta
  const [result] = await pool.query('DELETE FROM Ministry WHERE id = ?', [id]);
  if ((result as any).affectedRows === 0) {
    throw new Error('Ministério não encontrado');
  }
};

// Ativa/Desativa um ministério
export const toggleMinistryStatus = async (id: number, isActive: boolean) => {
   await pool.query('UPDATE Ministry SET isActive = ? WHERE id = ?', [isActive, id]);
   
   const [rows] = await pool.query<Ministry[]>('SELECT * FROM Ministry WHERE id = ?', [id]);
   if (rows.length === 0) {
    throw new Error('Ministério não encontrado');
  }
  return rows[0];
};