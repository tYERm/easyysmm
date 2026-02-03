import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!process.env.DATABASE_URL) return res.status(500).send('DB config missing');
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
      const { userId, action } = req.body || {};
      const isBanned = action === 'ban';
      
      try {
          await sql`UPDATE users SET is_banned = ${isBanned} WHERE id = ${userId}`;
          return res.status(200).json({ success: true });
      } catch (e: any) {
          return res.status(500).json({ error: e.message });
      }
  }
  return res.status(405).send('Method not allowed');
}