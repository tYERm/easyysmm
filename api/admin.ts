import { neon } from '@neondatabase/serverless';
import { validateTelegramWebAppData, setSecurityHeaders } from './_validate.js';

export default async function handler(req: any, res: any) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DB config missing' });

  // 1. Validate Authentication
  const authHeader = req.headers.authorization;
  const initData = authHeader?.startsWith('tma ') ? authHeader.slice(4) : authHeader;
  const { isValid, user: validatedUser } = validateTelegramWebAppData(initData);

  if (!isValid || !validatedUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const ADMIN_ID = 7753372971;

  if (validatedUser.id !== ADMIN_ID) {
      return res.status(403).json({ error: 'Forbidden. Admin access only.' });
  }

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
      const { userId, action } = req.body || {};
      
      if (!userId || !action) {
          return res.status(400).json({ error: 'Missing params' });
      }

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