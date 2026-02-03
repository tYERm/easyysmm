export interface SmmService {
  id: number;
  name: string;
  min: number;
  max: number;
  price_per_k: number; // RUB
  description: string;
  url_example: string;
  url_prompt: string;
  url_type: 'channel' | 'post' | 'bot';
  icon: 'users' | 'eye' | 'thumbs-up' | 'thumbs-down' | 'bot';
}

export interface Order {
  id: string; // generated locally for frontend
  serviceId: number;
  serviceName: string;
  url: string;
  quantity: number;
  amountTon: number;
  amountRub: number;
  memo: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: string;
  userId?: number;
}

export interface UserStats {
  totalSpentTon: number;
  totalOrders: number;
  stats: {
    subscribers: number; // users icon
    views: number;       // eye icon
    reactions: number;   // thumbs up/down
    botUsers: number;    // bot icon
  }
}

export interface WalletInfo {
  address: string;
  appName: string;
  balance: number;
  isConnected: boolean;
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface UserState {
  user: TelegramUser | null;
  stats: UserStats;
  orders: Order[];
  wallet: WalletInfo | null;
}

// Legacy types (kept for compatibility if needed, though mostly replaced)
export interface LinkItem {
  id: string;
  title: string;
  url: string;
  icon: 'github' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'mail' | 'tiktok' | 'discord' | 'globe';
}

export interface UserProfile {
  name: string;
  title: string;
  bio: string;
  avatarUrl: string;
}

export interface AppTheme {
  backgroundType: 'solid' | 'gradient' | 'animated' | 'mesh';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  buttonStyle: 'rounded' | 'square' | 'outline' | 'glass' | 'shadow' | 'minimal';
  avatarShape: 'circle' | 'rounded' | 'square';
}

export interface AppState {
  profile: UserProfile;
  links: LinkItem[];
  theme: AppTheme;
}