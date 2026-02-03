import { Order, TelegramUser, UserStats, SmmService, WalletInfo } from "../types";
import { SERVICES, ADMIN_ID } from "./data";

// Ключи для localStorage
const STORAGE_KEY_ORDERS = 'easysmm_orders_v2';
const STORAGE_KEY_WALLET = 'easysmm_wallet_v2';

// Начальная статистика
const INITIAL_STATS: UserStats = {
  totalSpentTon: 0,
  totalOrders: 0,
  stats: {
    subscribers: 0,
    views: 0,
    reactions: 0,
    botUsers: 0
  }
};

/**
 * Получение данных пользователя
 */
export const getUserData = (): TelegramUser | null => {
  if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    return (window as any).Telegram.WebApp.initDataUnsafe.user as TelegramUser;
  }
  
  if (process.env.NODE_ENV === 'development') {
    return {
      id: ADMIN_ID, // Use Admin ID for dev testing
      first_name: "Admin",
      last_name: "Test",
      username: "admin_test",
      photo_url: ""
    };
  }

  return null;
};

/**
 * Получает ВСЕ заказы (для админа) или фильтрует по пользователю
 */
export const getOrders = (userId: number | undefined, isAdmin: boolean = false): Order[] => {
  const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
  const allOrders: Order[] = saved ? JSON.parse(saved) : [];

  if (isAdmin) {
    return allOrders;
  }

  // Для обычного пользователя фильтруем только его заказы
  // (В Order интерфейсе нет userId, добавим его неявно через фильтрацию или при сохранении)
  // Примечание: В текущей реализации Order не хранил userId в явном виде в types.ts, 
  // но мы будем сохранять его в saveOrder. Для совместимости со старыми записями
  // показываем все, если userId не передан.
  if (!userId) return [];

  return allOrders.filter((o: any) => o.userId === userId);
};

/**
 * Сохраняет новый заказ
 */
export const saveOrder = (order: Order, userId: number): Order[] => {
  const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
  const allOrders: Order[] = saved ? JSON.parse(saved) : [];
  
  // Добавляем userId к объекту заказа (расширяем объект, даже если в типах нет)
  const orderWithUser = { ...order, userId };
  
  const newOrders = [orderWithUser, ...allOrders];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(newOrders));
  
  return newOrders.filter((o: any) => o.userId === userId);
};

/**
 * Обновление статуса заказа (Для Админа)
 */
export const updateOrderStatus = (orderId: string, newStatus: 'completed' | 'cancelled'): Order[] => {
    const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
    let allOrders: Order[] = saved ? JSON.parse(saved) : [];

    allOrders = allOrders.map(order => {
        if (order.id === orderId) {
            return { ...order, status: newStatus };
        }
        return order;
    });

    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(allOrders));
    return allOrders;
}

/**
 * Рассчитывает статистику пользователя
 */
export const calculateStats = (orders: Order[]): UserStats => {
  const stats = { ...INITIAL_STATS.stats };
  let totalSpentTon = 0;

  orders.forEach(order => {
    if (order.status === 'active' || order.status === 'completed') {
      totalSpentTon += order.amountTon;

      const service = SERVICES.find(s => s.id === order.serviceId);
      
      if (service) {
        switch (service.icon) {
          case 'users':
            stats.subscribers += order.quantity;
            break;
          case 'eye':
            stats.views += order.quantity;
            break;
          case 'thumbs-up':
          case 'thumbs-down':
            stats.reactions += order.quantity;
            break;
          case 'bot':
            stats.botUsers += order.quantity;
            break;
        }
      }
    }
  });

  return {
    totalSpentTon,
    totalOrders: orders.length,
    stats
  };
};

// --- WALLET ---

export const saveWalletData = (wallet: WalletInfo) => {
  localStorage.setItem(STORAGE_KEY_WALLET, JSON.stringify(wallet));
};

export const disconnectWalletData = () => {
  localStorage.removeItem(STORAGE_KEY_WALLET);
};

export const fetchWalletBalance = async (address: string): Promise<number> => {
    try {
        const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
        if (response.ok) {
            const data = await response.json();
            if (data.ok && data.result) {
                const nanoTon = Number(data.result);
                return nanoTon / 1000000000;
            }
        }
        return 0;
    } catch (e) {
        console.error("Error fetching balance:", e);
        return 0;
    }
};