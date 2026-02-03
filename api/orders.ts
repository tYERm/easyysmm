import { neon } from '@neondatabase/serverless';

export default async function handler(req: Request) {
  if (!process.env.DATABASE_URL) return new Response('DB config missing', { status: 500 });
  const sql = neon(process.env.DATABASE_URL);

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      const isAdmin = url.searchParams.get('isAdmin') === 'true';

      let orders;
      if (isAdmin) {
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
          return new Response('Missing params', { status: 400 });
      }

      return new Response(JSON.stringify(orders), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
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

      // Update User Stats (Simplified incremental update)
      if (status === 'active') {
         // Determine stat column based on service logic done in frontend, 
         // but for DB purity we should update user_stats.
         // For now, we will just rely on frontend recalculating from order history 
         // or implement a basic counter increment here if needed.
         await sql`
            INSERT INTO user_stats (user_id, total_orders, total_spent_ton)
            VALUES (${userId}, 1, ${amountTon})
            ON CONFLICT (user_id) DO UPDATE SET
                total_orders = user_stats.total_orders + 1,
                total_spent_ton = user_stats.total_spent_ton + ${amountTon}
         `;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'PATCH') {
        const body = await req.json();
        const { orderId, status } = body;
        
        await sql`UPDATE orders SET status = ${status} WHERE order_id = ${orderId}`;
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response('Method not allowed', { status: 405 });

  } catch (error: any) {
    console.error("Order API Error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}