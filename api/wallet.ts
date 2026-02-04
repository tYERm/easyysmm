import { neon } from '@neondatabase/serverless';
import { validateTelegramWebAppData, setSecurityHeaders } from './_validate';

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

  const sql = neon(process.env.DATABASE_URL);

  if (req.method === 'POST') {
    try {
        const { address, appName } = req.body || {};
        
        if (!address) return res.status(400).json({ error: 'Address required' });

        // Use ID from token, ignore userId in body
        const userId = validatedUser.id; 
        
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