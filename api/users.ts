import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Добавляем CORS заголовки для безопасности и доступа
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).send('Database configuration missing');
  }

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    try {
      // В Vercel Node.js body уже распарсен, если Content-Type: application/json
      const body = req.body || {};
      const { id, first_name, last_name, username, photo_url, language_code } = body;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Upsert user (insert or update)
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

      const user = await sql`SELECT is_banned, created_at, last_login FROM users WHERE id = ${id}`;
      
      const createdAt = new Date(user[0].created_at).getTime();
      const now = Date.now();
      
      const isNew = user[0] && ((now - createdAt) < 60000);

      return res.status(200).json({ 
        isBanned: user[0]?.is_banned || false,
        isNew: isNew
      });
    } catch (error: any) {
      console.error('API Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
      const { id, mode } = req.query;

      if (mode === 'list') {
          try {
             const allUsers = await sql`SELECT * FROM users ORDER BY created_at DESC LIMIT 200`;
             return res.status(200).json(allUsers);
          } catch (e: any) {
             return res.status(500).json({ error: e.message });
          }
      }

      if (id) {
          try {
            const user = await sql`SELECT * FROM users WHERE id = ${id}`;
            return res.status(200).json(user[0] || {});
          } catch (e: any) {
             return res.status(500).json({ error: e.message });
          }
      }

      return res.status(400).send('Missing params');
  }

  return res.status(405).send('Method not allowed');
}