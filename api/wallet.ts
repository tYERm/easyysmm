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
    try {
        const { userId, address, appName } = req.body || {};
        
        await sql`
            INSERT INTO wallets (user_id, address, wallet_app, is_connected, connected_at)
            VALUES (${userId}, ${address}, ${appName}, TRUE, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                address = EXCLUDED.address,
                wallet_app = EXCLUDED.wallet_app,
                is_connected = TRUE,
                connected_at = NOW()
        `;
        
        return res.status(200).json({ success: true });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
  }
  
  return res.status(405).send('Method not allowed');
}