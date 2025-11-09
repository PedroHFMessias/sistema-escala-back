import { Router } from 'express';
// Corrigido: a importação de 'login' e 'register' estava faltando no log de erro
import { login, register } from './auth.controller'; 

const router = Router();

router.post('/login', login);
router.post('/register', register);

export default router; // Agora funciona com module: "CommonJS"