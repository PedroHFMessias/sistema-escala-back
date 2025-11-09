import { pool } from '../../db/mysql';
import bcrypt from 'bcryptjs';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// --- Interfaces ---

interface Member extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  rg: string;
  address: any;
  userType: 'VOLUNTEER' | 'COORDINATOR';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  ministries: { id: number; name: string; color: string }[] | null;
}

interface MemberInput {
  name: string;
  email: string;
  phone: string;
  password?: string; // Senha é opcional na atualização
  cpf: string;
  rg: string;
  address: any;
  userType: 'VOLUNTEER' | 'COORDINATOR';
  status: 'ACTIVE' | 'INACTIVE';
  ministries: number[]; // Array de IDs de ministérios
}

interface ListFilters {
  search?: string;
  userType?: 'COORDINATOR' | 'VOLUNTEER';
  ministryId?: string;
}

// --- Funções Auxiliares ---

/**
 * Busca um único membro e seus ministérios
 */
const fetchMemberById = async (id: number): Promise<Member | null> => {
  const [rows] = await pool.query<Member[]>(
    `
    SELECT 
      u.*,
      (SELECT 
         JSON_ARRAYAGG(
           JSON_OBJECT('id', m.id, 'name', m.name, 'color', m.color)
         )
       FROM MinistriesOnUsers mou
       JOIN Ministry m ON mou.ministryId = m.id
       WHERE mou.userId = u.id
      ) as ministries
    FROM User u
    WHERE u.id = ?
    `,
    [id]
  );
  if (rows.length === 0) {
    return null;
  }
  // Remove a senha do objeto antes de retornar
  delete (rows[0] as any).password;
  return rows[0];
};

// --- Serviços ---

/**
 * Lista todos os membros com base nos filtros
 */
export const listMembers = async (filters: ListFilters) => {
  let query = `
    SELECT 
      u.*,
      (SELECT 
         JSON_ARRAYAGG(
           JSON_OBJECT('id', m.id, 'name', m.name, 'color', m.color)
         )
       FROM MinistriesOnUsers mou
       JOIN Ministry m ON mou.ministryId = m.id
       WHERE mou.userId = u.id
      ) as ministries
    FROM User u
  `;
  const params: any[] = [];
  const whereClauses: string[] = [];

  // Filtro de busca (nome, email, cpf)
  if (filters.search) {
    whereClauses.push(`(u.name LIKE ? OR u.email LIKE ? OR u.cpf LIKE ?)`);
    const searchLike = `%${filters.search}%`;
    params.push(searchLike, searchLike, searchLike);
  }

  // Filtro por tipo de usuário
  if (filters.userType) {
    whereClauses.push(`u.userType = ?`);
    params.push(filters.userType);
  }
  
  // Filtro por ministério (o mais complexo)
  if (filters.ministryId) {
    // Verifica se o usuário está em um ministério específico
    whereClauses.push(`EXISTS (
      SELECT 1 FROM MinistriesOnUsers mou 
      WHERE mou.userId = u.id AND mou.ministryId = ?
    )`);
    params.push(Number(filters.ministryId));
  }

  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }

  query += ` ORDER BY u.name`;

  const [rows] = await pool.query<Member[]>(query, params);
  
  // Remove a senha de todos os usuários
  return rows.map(row => {
    delete (row as any).password;
    return row;
  });
};

/**
 * Obtém um membro específico
 */
export const getMemberById = async (id: number) => {
  return fetchMemberById(id);
};

/**
 * Cria um novo membro e o vincula aos ministérios (Transação)
 */
export const createMember = async (data: MemberInput) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Criptografar a senha
    const hashedPassword = await bcrypt.hash(data.password as string, 10);
    const addressJson = JSON.stringify(data.address);

    // 2. Inserir o Usuário
    const [userResult] = await connection.query<ResultSetHeader>(
      'INSERT INTO User (name, email, phone, password, cpf, rg, address, userType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.name, data.email, data.phone, hashedPassword,
        data.cpf, data.rg, addressJson, 
        data.userType.toUpperCase() // <-- MUDANÇA AQUI
      ]
    );
    const newUserId = userResult.insertId;

    // 3. Inserir os vínculos em MinistriesOnUsers
    if (data.ministries && data.ministries.length > 0) {
      const ministryValues = data.ministries.map(ministryId => [newUserId, ministryId]);
      await connection.query(
        'INSERT INTO MinistriesOnUsers (userId, ministryId) VALUES ?',
        [ministryValues]
      );
    }

    await connection.commit();
    return fetchMemberById(newUserId);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Atualiza um membro e seus ministérios (Transação)
 */
export const updateMember = async (id: number, data: Partial<MemberInput>) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1. Atualizar dados do Usuário
    await connection.query(
      'UPDATE User SET name = ?, email = ?, phone = ?, cpf = ?, rg = ?, address = ?, userType = ? WHERE id = ?',
      [
        data.name, data.email, data.phone, data.cpf, data.rg,
        JSON.stringify(data.address), 
        data.userType?.toUpperCase(), // <-- MUDANÇA AQUI
        id
      ]
    );

    // 2. Atualizar os vínculos de ministério
    if (data.ministries) {
      await connection.query('DELETE FROM MinistriesOnUsers WHERE userId = ?', [id]);
      
      if (data.ministries.length > 0) {
        const ministryValues = data.ministries.map(ministryId => [id, ministryId]);
        await connection.query(
          'INSERT INTO MinistriesOnUsers (userId, ministryId) VALUES ?',
          [ministryValues]
        );
      }
    }

    await connection.commit();
    return fetchMemberById(id);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Deleta um membro
 */
export const deleteMember = async (id: number) => {
  // O MySQL vai disparar um erro de chave estrangeira se o membro estiver em escalas.
  // O controller vai capturar esse erro (ER_ROW_IS_REFERENCED_2)
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM User WHERE id = ?', [id]);
  if (result.affectedRows === 0) {
    throw new Error('Membro não encontrado');
  }
};

/**
 * Ativa/Desativa um membro
 */
export const toggleMemberStatus = async (id: number, status: 'ACTIVE' | 'INACTIVE') => {
  const [result] = await pool.query<ResultSetHeader>(
    'UPDATE User SET status = ? WHERE id = ?',
    [status, id]
  );
  if (result.affectedRows === 0) {
    throw new Error('Membro não encontrado');
  }
  return fetchMemberById(id);
};