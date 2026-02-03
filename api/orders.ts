import { neon } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
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

  if (!process.env.DATABASE_URL) return res.status(500).send('DB config missing');
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const { userId, isAdmin } = req.query;

      let orders;
      if (isAdmin === 'true') {
        orders = await sql`
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
      } else if (userId) {
        orders = await sql`
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
            WHERE user_id = ${userId} 
            ORDER BY created_at DESC`;
      } else {
          return res.status(400).send('Missing params');
      }

      return res.status(200).json(orders);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const { id, userId, serviceId, serviceName, url, quantity, amountTon, amountRub, memo, status } = body;

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
        const body = req.body || {};
        const { orderId, status } = body;
        
        await sql`UPDATE orders SET status = ${status} WHERE order_id = ${orderId}`;
        
        return res.status(200).json({ success: true });
    }

    return res.status(405).send('Method not allowed');

  } catch (error: any) {
    console.error("Order API Error", error);
    return res.status(500).json({ error: error.message });
  }
}