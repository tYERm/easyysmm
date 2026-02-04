import { neon } from '@neondatabase/serverless';
import { validateTelegramWebAppData, setSecurityHeaders } from './_validate';

export default async function handler(req: any, res: any) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 1. Validate Authentication
  const authHeader = req.headers.authorization; // Expected: "tma <initData>"
  const initData = authHeader?.startsWith('tma ') ? authHeader.slice(4) : authHeader;
  
  const { isValid, user: validatedUser, error } = validateTelegramWebAppData(initData);

  if (!isValid || !validatedUser) {
    return res.status(401).json({ error: error || 'Unauthorized' });
  }

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    try {
      // TRUST ONLY VALIDATED DATA from Telegram
      const { id, first_name, last_name, username, photo_url, language_code } = validatedUser;

      // Upsert user
      await sql`
        INSERT INTO users (id, first_name, last_name, username, photo_url, language_code, last_login)
        VALUES (${id}, ${first_name}, ${last_name}, ${username}, ${photo_url}, ${language_code}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          username = EXCLUDED.username,
          photo_url = EXCLUDED.photo_url,
          last_login = NOW()
      `;

      const dbUser = await sql`SELECT is_banned, created_at FROM users WHERE id = ${id}`;
      
      const createdAt = new Date(dbUser[0].created_at).getTime();
      const now = Date.now();
      const isNew = dbUser[0] && ((now - createdAt) < 60000); // Created within last minute

      return res.status(200).json({ 
        isBanned: dbUser[0]?.is_banned || false,
        isNew: isNew
      });
    } catch (error: any) {
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  if (req.method === 'GET') {
      const { mode, id } = req.query;

      // Only allow admin (hardcoded ID check) to list all users
      // ADMIN_ID should technically be in env vars for better security, 
      // but matching the client constant for now.
      const ADMIN_ID = 7753372971; 
      
      if (mode === 'list') {
          if (validatedUser.id !== ADMIN_ID) {
              return res.status(403).json({ error: 'Forbidden' });
          }

          try {
             const allUsers = await sql`SELECT * FROM users ORDER BY created_at DESC LIMIT 200`;
             return res.status(200).json(allUsers);
          } catch (e: any) {
             return res.status(500).json({ error: 'Database error' });
          }
      }

      // Allow users to fetch their own profile or admin to fetch anyone
      const targetId = id ? Number(id) : validatedUser.id;
      
      if (targetId !== validatedUser.id && validatedUser.id !== ADMIN_ID) {
          return res.status(403).json({ error: 'Forbidden' });
      }

      try {
        const user = await sql`SELECT * FROM users WHERE id = ${targetId}`;
        return res.status(200).json(user[0] || {});
      } catch (e: any) {
         return res.status(500).json({ error: 'Database error' });
      }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}