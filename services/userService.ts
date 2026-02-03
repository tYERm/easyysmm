import { Order, TelegramUser, UserStats, SmmService, WalletInfo } from "../types";
import { SERVICES } from "./data";

// Ключи для localStorage (в реальном проекте это была бы БД)
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
 * Имитация получения данных пользователя из "Бэкенда".
 * В реальности здесь был бы запрос к API, который проверяет auth token.
 */
export const getUserData = (): TelegramUser | null => {
  // Пытаемся получить данные от Telegram WebApp
  if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    return (window as any).Telegram.WebApp.initDataUnsafe.user as TelegramUser;
  }
  
  // Если мы вне Telegram (для тестов), возвращаем мок-юзера
  if (process.env.NODE_ENV === 'development') {
    return {
      id: 123456789,
      first_name: "Test",
      last_name: "User",
      username: "testuser",
      photo_url: ""
    };
  }

  return null;
};

/**
 * Получает историю заказов (фильтруя по ID пользователя, если бы была реальная БД).
 */
export const getUserOrders = (): Order[] => {
  const saved = localStorage.getItem(STORAGE_KEY_ORDERS);
  return saved ? JSON.parse(saved) : [];
};

/**
 * Сохраняет новый заказ и обновляет статистику.
 */
export const saveOrder = (order: Order): Order[] => {
  const orders = getUserOrders();
  const newOrders = [order, ...orders];
  localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(newOrders));
  return newOrders;
};

/**
 * Рассчитывает статистику пользователя на основе его заказов.
 * Эта логика обычно находится на бэкенде.
 */
export const calculateStats = (orders: Order[]): UserStats => {
  const stats = { ...INITIAL_STATS.stats };
  let totalSpentTon = 0;

  orders.forEach(order => {
    // Считаем деньги (только активные или завершенные заказы)
    if (order.status === 'active' || order.status === 'completed') {
      totalSpentTon += order.amountTon;

      // Определяем тип услуги по ID или иконке
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

/**
 * --- WALLET BACKEND LOGIC ---
 */

// Получение сохраненного кошелька (для кэша)
export const getWalletData = (): WalletInfo | null => {
  const saved = localStorage.getItem(STORAGE_KEY_WALLET);
  return saved ? JSON.parse(saved) : null;
};

// Сохранение (кэширование) данных кошелька
export const saveWalletData = (wallet: WalletInfo) => {
  localStorage.setItem(STORAGE_KEY_WALLET, JSON.stringify(wallet));
};

export const disconnectWalletData = () => {
  localStorage.removeItem(STORAGE_KEY_WALLET);
};

/**
 * Запрос к реальному блокчейну TON для получения баланса.
 * Используем публичный API tonapi.io (бесплатный лимит).
 */
export const fetchWalletBalance = async (address: string): Promise<number> => {
    try {
        // Используем публичный RPC endpoint Toncenter
        const response = await fetch(`https://toncenter.com/api/v2/getAddressBalance?address=${address}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data.ok && data.result) {
                // Баланс приходит в нанотонах (строка)
                const nanoTon = Number(data.result);
                return nanoTon / 1000000000;
            }
        }
        
        console.warn("Failed to fetch balance from Toncenter, mock fallback");
        return 0; // Или вернуть 0, если не удалось получить
    } catch (e) {
        console.error("Error fetching balance:", e);
        return 0;
    }
};