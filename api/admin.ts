import { neon } from '@neondatabase/serverless';

export default async function handler(req: Request) {
  if (!process.env.DATABASE_URL) return new Response('DB config missing', { status: 500 });
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
      const { userId, action } = await req.json();
      const isBanned = action === 'ban';
      
      try {
          await sql`UPDATE users SET is_banned = ${isBanned} WHERE id = ${userId}`;
          return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
      } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
      }
  }
  return new Response('Method not allowed', { status: 405 });
}