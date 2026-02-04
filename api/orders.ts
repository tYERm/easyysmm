import { neon } from '@neondatabase/serverless';
import { validateTelegramWebAppData, setSecurityHeaders } from './_validate.js';

const DB_URL_FALLBACK = 'postgresql://neondb_owner:npg_1Qf6NTkrGpRH@ep-orange-water-ahho9xh4-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

export default async function handler(req: any, res: any) {
  setSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const dbUrl = process.env.DATABASE_URL || DB_URL_FALLBACK;
  if (!dbUrl) return res.status(500).json({ error: 'DB config missing' });

  // 1. Validate Authentication
  const authHeader = req.headers.authorization;
  const initData = authHeader?.startsWith('tma ') ? authHeader.slice(4) : authHeader;
  const { isValid, user: validatedUser, error } = validateTelegramWebAppData(initData);

  if (!isValid || !validatedUser) {
    console.error("Auth failed orders:", error);
    return res.status(401).json({ error: error || 'Unauthorized' });
  }

  const sql = neon(dbUrl);
  const ADMIN_ID = 7753372971;

  try {
    if (req.method === 'GET') {
      const { userId, isAdmin } = req.query;

      // Security Check: Access Control
      if (isAdmin === 'true') {
        if (validatedUser.id !== ADMIN_ID) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const orders = await sql`
            SELECT 
                order_id as id,
                user_id as "userId",
                service_id as "serviceId",
                service_name as "serviceName",
                target_url as url,
                quantity,
                amount_ton as "amountTon",
                amount_rub as "amountRub",
                memo_id as memo,
                status,
                created_at as "createdAt"
            FROM orders 
            ORDER BY created_at DESC 
            LIMIT 200`;
         return res.status(200).json(orders);
      } 
      
      // Regular user fetching their own orders
      // Even if they pass ?userId=someoneElse, we enforce fetching *their* data if not admin
      const targetId = userId ? Number(userId) : validatedUser.id;
      
      if (targetId !== validatedUser.id && validatedUser.id !== ADMIN_ID) {
           return res.status(403).json({ error: 'Cannot view other users data' });
      }

      const orders = await sql`
        SELECT 
            order_id as id,
            user_id as "userId",
            service_id as "serviceId",
            service_name as "serviceName",
            target_url as url,
            quantity,
            amount_ton as "amountTon",
            amount_rub as "amountRub",
            memo_id as memo,
            status,
            created_at as "createdAt"
        FROM orders 
        WHERE user_id = ${targetId} 
        ORDER BY created_at DESC`;

      return res.status(200).json(orders);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      // Validate inputs
      const { id, serviceId, serviceName, url, quantity, amountTon, amountRub, memo, status } = body;

      // Basic Input Validation
      if (!id || !serviceId || !url || !quantity || !amountTon) {
          return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (quantity <= 0) {
          return res.status(400).json({ error: 'Invalid quantity' });
      }

      // URL Sanitization (Basic check)
      if (!url.startsWith('http') && !url.startsWith('https') && !url.startsWith('tg://')) {
           return res.status(400).json({ error: 'Invalid URL format' });
      }

      // Enforce User ID from Token
      const userId = validatedUser.id;

      await sql`
        INSERT INTO orders (
            order_id, user_id, service_id, service_name, target_url, 
            quantity, amount_ton, amount_rub, memo_id, status
        ) VALUES (
            ${id}, ${userId}, ${serviceId}, ${serviceName}, ${url}, 
            ${quantity}, ${amountTon}, ${amountRub}, ${memo}, ${status}
        )
      `;

      if (status === 'active') {
         // Update stats safely using the validated userId
         await sql`
            INSERT INTO user_stats (user_id, total_orders, total_spent_ton)
            VALUES (${userId}, 1, ${amountTon})
            ON CONFLICT (user_id) DO UPDATE SET
                total_orders = user_stats.total_orders + 1,
                total_spent_ton = user_stats.total_spent_ton + ${amountTon}
         `;
      }

      return res.status(200).json({ success: true });
    }

    if (req.method === 'PATCH') {
        // Only Admin can update order status
        if (validatedUser.id !== ADMIN_ID) {
            return res.status(403).json({ error: 'Admin only' });
        }

        const body = req.body || {};
        const { orderId, status } = body;
        
        if (!['completed', 'cancelled', 'pending', 'active'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await sql`UPDATE orders SET status = ${status} WHERE order_id = ${orderId}`;
        
        return res.status(200).json({ success: true });
    }

    return res.status(405).send('Method not allowed');

  } catch (error: any) {
    console.error("Order API Error", error);
    return res.status(500).json({ error: 'Server Error' });
  }
}