import { Order, TelegramUser, UserStats, SmmService, WalletInfo } from "../types";
import { SERVICES, ADMIN_ID } from "./data";

// Initial Empty Stats (Exported for App.tsx)
export const INITIAL_STATS: UserStats = {
  totalSpentTon: 0,
  totalOrders: 0,
  stats: {
    subscribers: 0,
    views: 0,
    reactions: 0,
    botUsers: 0
  }
};

// Helper to get Telegram Init Data for Auth
const getAuthHeaders = () => {
    let initData = '';
    if ((window as any).Telegram?.WebApp?.initData) {
        initData = (window as any).Telegram.WebApp.initData;
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `tma ${initData}`
    };
};

/**
 * Sync user with DB on startup
 */
export const syncUserWithDb = async (user: TelegramUser): Promise<{ isBanned: boolean, isNew: boolean }> => {
    try {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Sync failed');
        return await res.json();
    } catch (e) {
        console.error("User sync error:", e);
        return { isBanned: false, isNew: false };
    }
};

/**
 * Get All Users (For Admin Panel)
 */
export const getAllUsers = async (): Promise<any[]> => {
    try {
        const res = await fetch('/api/users?mode=list', {
            headers: getAuthHeaders()
        }); 
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Get all users error:", e);
        return [];
    }
};

/**
 * Get Banned Users (For Admin Panel)
 */
export const getBannedUsers = async (): Promise<number[]> => {
    try {
        const users = await getAllUsers();
        return users.filter((u: any) => u.is_banned).map((u: any) => Number(u.id));
    } catch (e) {
        return [];
    }
};

export const banUser = async (userId: number) => {
    await fetch('/api/admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action: 'ban' })
    });
};

export const unbanUser = async (userId: number) => {
    await fetch('/api/admin', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, action: 'unban' })
    });
};

export const isUserBanned = async (userId: number): Promise<boolean> => {
    try {
        const res = await fetch(`/api/users?id=${userId}`, {
            headers: getAuthHeaders()
        });
        const user = await res.json();
        return user.is_banned || false;
    } catch {
        return false;
    }
};

/**
 * Get User Data (From Client Telegram WebApp)
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
 * Get Orders (Fetch from API)
 */
export const getOrders = async (userId: number | undefined, isAdmin: boolean = false): Promise<Order[]> => {
  try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId.toString());
      if (isAdmin) params.append('isAdmin', 'true');

      const res = await fetch(`/api/orders?${params.toString()}`, {
          headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      
      const orders = await res.json();
      
      return orders.map((o: any) => ({
          ...o,
          amountTon: Number(o.amountTon),
          amountRub: Number(o.amountRub),
          quantity: Number(o.quantity),
          userId: Number(o.userId),
          memo: Number(o.memo)
      }));
  } catch (e) {
      console.error("Get orders error:", e);
      return [];
  }
};

/**
 * Save Order (Post to API)
 */
export const saveOrder = async (order: Order, userId: number): Promise<Order[]> => {
  try {
      await fetch('/api/orders', {
          method: 'POST',
          headers: getAuthHeaders(),
          // userId is technically ignored by backend now (taken from token), but kept for type compat
          body: JSON.stringify({ ...order, userId })
      });
      return await getOrders(userId, false);
  } catch (e) {
      console.error("Save order error:", e);
      return []; 
  }
};

/**
 * Update Order Status (For Admin)
 */
export const updateOrderStatus = async (orderId: string, newStatus: 'completed' | 'cancelled'): Promise<Order[]> => {
    try {
        await fetch('/api/orders', {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ orderId, status: newStatus })
        });
        return await getOrders(undefined, true);
    } catch (e) {
        return [];
    }
}

/**
 * Calculate Stats (Client side aggregation from fetched orders)
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

export const saveWalletData = async (wallet: WalletInfo) => {
  // We don't need to pass userId anymore, backend takes it from initData
  await fetch('/api/wallet', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
          address: wallet.address,
          appName: wallet.appName
      })
  });
};

export const disconnectWalletData = () => {
  // No explicit disconnect needed on backend
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