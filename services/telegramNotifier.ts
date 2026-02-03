import { BOT_TOKEN, ADMIN_ID, formatTon } from "./data";
import { Order, TelegramUser } from "../types";

const sendMessage = async (text: string) => {
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: ADMIN_ID,
                text: text,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        if (!response.ok) {
            console.error('Failed to send Telegram notification:', await response.text());
        }
    } catch (error) {
        console.error('Error sending Telegram notification:', error);
    }
};

/**
 * Уведомление о новом пользователе
 */
export const notifyAdminNewUser = async (user: TelegramUser) => {
    const userLink = user.username ? `@${user.username}` : `ID: ${user.id}`;
    const userName = `${user.first_name} ${user.last_name || ''}`.trim();

    const message = `
🎉 <b>НОВЫЙ ПОЛЬЗОВАТЕЛЬ!</b>

👤 <b>Имя:</b> ${userName}
🔗 <b>Профиль:</b> ${userLink}
🆔 <b>ID:</b> <code>${user.id}</code>
🌍 <b>Язык:</b> ${user.language_code || 'N/A'}

<i>Пользователь впервые открыл приложение.</i>
`;
    await sendMessage(message);
};

/**
 * Уведомление о новом заказе
 */
export const notifyAdminNewOrder = async (order: Order, user: TelegramUser | null) => {
    const userLink = user?.username ? `@${user.username}` : `ID: ${user?.id || 'Unknown'}`;
    const userName = user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Аноним';

    const message = `
📦 <b>НОВЫЙ ЗАКАЗ!</b>

<b>Услуга:</b> ${order.serviceName}
<b>ID Заказа:</b> <code>${order.memo}</code>
<b>Ссылка:</b> ${order.url}
<b>Количество:</b> ${order.quantity} шт

💰 <b>Сумма:</b> ${formatTon(order.amountTon)} TON
👤 <b>Заказчик:</b> <a href="tg://user?id=${user?.id}">${userName}</a> (${userLink})

⚠️ <i>Проверьте поступление средств на кошелек перед выполнением!</i>
`;
    await sendMessage(message);
};