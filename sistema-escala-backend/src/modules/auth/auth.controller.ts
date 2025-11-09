import type { Request, Response } from 'express'; // <-- MUDANÇA AQUI
import * as AuthService from './auth.service';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios' });
    }

    const { token, user } = await AuthService.login(email, password);
    
    res.json({ token, user });
  } catch (error: any) {
    if (error.message === 'Usuário não encontrado' || error.message === 'Senha inválida') {
      return res.status(401).json({ message: 'Email ou senha inválidos' });
    }
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const userData = req.body;

    if (!userData.email || !userData.password || !userData.name || !userData.cpf || !userData.rg) {
       return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
    }

    const newUser = await AuthService.register(userData);
    
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email, CPF ou RG já cadastrado.' });
    }
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno no servidor' });
  }
};