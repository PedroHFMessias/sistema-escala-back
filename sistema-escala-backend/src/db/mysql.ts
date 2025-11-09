import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Cria um "pool" de conexões. É mais eficiente que criar uma nova conexão a cada consulta.
export const pool = mysql.createPool(process.env.DATABASE_URL as string);

// Função de teste (opcional)
export async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS solution');
    console.log('Conexão com o MySQL bem-sucedida!', rows);
  } catch (error) {
    console.error('Falha ao conectar com o MySQL:', error);
  }
}