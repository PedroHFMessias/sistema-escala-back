import { pool } from '../../db/mysql';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2'; // <-- MUDANÇA AQUI

// Interface para sabermos como é o usuário vindo do banco
interface User extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string; // O hash
  phone: string;
  cpf: string;
  rg: string;
  address: any;
  userType: 'VOLUNTEER' | 'COORDINATOR';
  status: 'ACTIVE' | 'INACTIVE';
}

/**
 * Lógica de Login
 */
export const login = async (email: string, password: string) => {
  const [rows] = await pool.query<User[]>('SELECT * FROM User WHERE email = ?', [email]);
  const user = rows[0];

  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Senha inválida');
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Segredo JWT não configurado');
  }

  const token = jwt.sign(
    { id: user.id, role: user.userType },
    secret,
    { expiresIn: '8h' }
  );

  const { password: _, ...userWithoutPassword } = user;

  return { token, user: userWithoutPassword };
};

/**
 * Lógica de Registro
 */
export const register = async (data: any) => {
  // 1. Criptografar a senha
  const hashedPassword = await bcrypt.hash(data.password, 10); 

  // 2. Formatar o endereço para JSON
  const addressJson = JSON.stringify(data.address);

  // 3. Inserir no banco de dados
  const [result] = await pool.query(
    'INSERT INTO User (name, email, phone, password, cpf, rg, address, userType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      data.name,
      data.email,
      data.phone,
      hashedPassword,
      data.cpf,
      data.rg,
      addressJson,
      data.userType.toUpperCase() // <-- MUDANÇA AQUI (converte para MAIÚSCULO)
    ]
  );
  
  const insertId = (result as any).insertId;

  // 4. Buscar o usuário recém-criado para retornar
  const [rows] = await pool.query<User[]>('SELECT * FROM User WHERE id = ?', [insertId]);
  
  if (!rows[0]) {
    throw new Error('Falha ao buscar usuário após o registro.');
  }

  // 5. Preparar dados do usuário para retornar
  const { password: _, ...newUser } = rows[0];
  
  return newUser;
};