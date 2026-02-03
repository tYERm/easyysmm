import { neon } from '@neondatabase/serverless';

export default async function handler(req: Request) {
  if (!process.env.DATABASE_URL) return new Response('DB config missing', { status: 500 });
  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    try {
        const { userId, address, appName } = await req.json();
        
        await sql`
            INSERT INTO wallets (user_id, address, wallet_app, is_connected, connected_at)
            VALUES (${userId}, ${address}, ${appName}, TRUE, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                address = EXCLUDED.address,
                wallet_app = EXCLUDED.wallet_app,
                is_connected = TRUE,
                connected_at = NOW()
        `;
        
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }
  
  return new Response('Method not allowed', { status: 405 });
}