import { Order, TelegramUser, UserStats, SmmService, WalletInfo } from "../types";
import { SERVICES, ADMIN_ID } from "./data";

// Ключи для localStorage
const STORAGE_KEY_ORDERS = 'easysmm_orders_v2';
const STORAGE_KEY_WALLET = 'easysmm_wallet_v2';
const STORAGE_KEY_VISITED = 'easysmm_visited';
const STORAGE_KEY_BANNED = 'easysmm_banned_users';

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
 * Проверяет, заходил ли пользователь ранее.
 * Если нет - возвращает true и помечает как посетившего.
 */
export const checkIsNewUser = (): boolean => {
    const hasVisited = localStorage.getItem(STORAGE_KEY_VISITED);
    if (!hasVisited) {
        localStorage.setItem(STORAGE_KEY_VISITED, 'true');
        return true;
    }
    return false;
};

/**
 * Работа с бан-листом (эмуляция для админа)
 */
export const getBannedUsers = (): number[] => {
    const list = localStorage.getItem(STORAGE_KEY_BANNED);
    return list ? JSON.parse(list) : [];
};

export const banUser = (userId: number) => {
    const list = getBannedUsers();
    if (!list.includes(userId)) {
        list.push(userId);
        localStorage.setItem(STORAGE_KEY_BANNED, JSON.stringify(list));
    }
};

export const unbanUser = (userId: number) => {
    const list = getBannedUsers();
    const newList = list.filter(id => id !== userId);
    localStorage.setItem(STORAGE_KEY_BANNED, JSON.stringify(newList));
};

export const isUserBanned = (userId: number): boolean => {
    // В реальном приложении этот запрос шел бы на сервер.
    // Здесь мы проверяем localStorage. 
    // Для демо: если Админ забанил кого-то в своем интерфейсе, это сохранится в EGO localStorage.
    // Чтобы проверить "себя", нам нужен бэкенд. 
    // Но мы сделаем проверку локально для демонстрации функционала "Бан" на самом себе, если нужно.
    const list = getBannedUsers();
    return list.includes(userId);
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

  if (!userId) return [];

  return allOrders.filter((o: any) => o.userId === userId);
};

/**
 * Сохраняет новый заказ
 */
export const saveOrder = (order: Order, userId: number): Order[] => {
  const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
  const allOrders: Order[] = saved ? JSON.parse(saved) : [];
  
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