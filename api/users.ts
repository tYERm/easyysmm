import { neon } from '@neondatabase/serverless';

export default async function handler(req: Request) {
  if (!process.env.DATABASE_URL) {
    return new Response('Database configuration missing', { status: 500 });
  }

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      const { id, first_name, last_name, username, photo_url, language_code } = body;

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

      // Check if banned
      const user = await sql`SELECT is_banned, created_at, last_login FROM users WHERE id = ${id}`;
      
      // Determine if new user (created within last 10 seconds)
      const isNew = user[0] && (new Date().getTime() - new Date(user[0].created_at).getTime() < 10000);

      return new Response(JSON.stringify({ 
        isBanned: user[0]?.is_banned || false,
        isNew: isNew
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      console.error('API Error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  // Get User (Admin check or Ban check)
  if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('id');
      if (userId) {
          const user = await sql`SELECT * FROM users WHERE id = ${userId}`;
          return new Response(JSON.stringify(user[0] || {}), { headers: { 'Content-Type': 'application/json' } });
      }
      // Get all users for admin
      const allUsers = await sql`SELECT * FROM users ORDER BY created_at DESC LIMIT 100`;
      return new Response(JSON.stringify(allUsers), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
}