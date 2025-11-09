import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../db/mysql';
import type { RowDataPacket } from 'mysql2';

// Precisamos estender a interface Request do Express
// para podermos anexar os dados do usuário nela.
interface UserPayload {
  id: number;
  role: 'VOLUNTEER' | 'COORDINATOR';
}

interface User extends RowDataPacket {
  id: number;
  userType: 'VOLUNTEER' | 'COORDINATOR';
}

// Adicionamos a propriedade 'user' ao Request do Express
declare global {
  namespace Express {
    export interface Request {
      user?: UserPayload;
    }
  }
}

/**
 * Middleware para verificar se o usuário está autenticado (tem um token válido)
 */
export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return res.status(500).json({ message: 'Erro interno: Segredo JWT não configurado.' });
  }

  try {
    // 1. Verifica se o token é válido e decodifica
    const payload = jwt.verify(token, secret) as UserPayload;

    // 2. [Verificação Bônus] Checa se o usuário ainda existe no banco
    const [rows] = await pool.query<User[]>('SELECT id, userType FROM User WHERE id = ?', [payload.id]);
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Token inválido - usuário não encontrado.' });
    }

    // 3. Anexa o payload (id e role) ao objeto 'req' para uso futuro
    req.user = { id: user.id, role: user.userType };
    
    // 4. Passa para a próxima função (o controlador da rota)
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' });
  }
};

/**
 * Middleware para verificar se o usuário é um Coordenador
 * Ele DEVE ser usado *depois* do middleware 'isAuthenticated'
 */
export const isCoordinator = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'COORDINATOR') {
    return res.status(403).json({ message: 'Acesso negado. Requer privilégios de coordenador.' });
  }
  
  // Se for coordenador, passa para a próxima função
  next();
};