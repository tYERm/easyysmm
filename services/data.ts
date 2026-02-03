import { SmmService } from "../types";

// Configuration
export const TON_TO_RUB = 101.63;
export const TON_WALLET = "UQC2mXNWkUqi__Qq1l66_LL36dOv_5ls7O6pWfbgnfvOiXVR";

// SECURITY WARNING: Storing bot tokens in frontend code is not secure for production apps.
// Ideally, this should be handled by a backend server.
export const BOT_TOKEN = "8546053832:AAFIkqG4VxnjldmYm6rNZ-AMEdF8FPIgEpM";
export const ADMIN_ID = 7753372971;

export const SERVICES: SmmService[] = [
  {
    id: 387,
    name: "🇷🇺 Русские подписчики",
    min: 550,
    max: 500000,
    price_per_k: 250.20,
    description: "Моментальный старт. Скорость до 100k в сутки. Гарантия 30 дней.",
    url_example: "https://t.me/channelname",
    url_prompt: "Ссылка на канал (публичный)",
    url_type: "channel",
    icon: 'users'
  },
  {
    id: 121,
    name: "🔥 RU Просмотры",
    min: 7000,
    max: 10000,
    price_per_k: 20.00,
    description: "Скорость 30/мин. Плавное добавление. Только на посты.",
    url_example: "https://t.me/channel/123",
    url_prompt: "Ссылка на пост",
    url_type: "post",
    icon: 'eye'
  },
  {
    id: 128,
    name: "👍 Позитивные реакции",
    min: 6000,
    max: 200000,
    price_per_k: 20.00,
    description: "Mix позитивных реакций: 👍 ❤️ 🔥 🎉",
    url_example: "https://t.me/channel/123",
    url_prompt: "Ссылка на пост",
    url_type: "post",
    icon: 'thumbs-up'
  },
  {
    id: 129,
    name: "👎 Негативные реакции",
    min: 6000,
    max: 10000,
    price_per_k: 25.00,
    description: "Mix негативных реакций: 👎 💩 🤮",
    url_example: "https://t.me/channel/123",
    url_prompt: "Ссылка на пост",
    url_type: "post",
    icon: 'thumbs-down'
  },
  {
    id: 372,
    name: "🤖 Подписчики для Бота",
    min: 3000,
    max: 30000,
    price_per_k: 45.00,
    description: "Запуски бота из разных стран. Быстрый старт.",
    url_example: "https://t.me/mybot",
    url_prompt: "Ссылка на бота",
    url_type: "bot",
    icon: 'bot'
  }
];

export const formatTon = (amount: number) => amount.toFixed(3);
export const formatRub = (amount: number) => amount.toFixed(2);

export const calculatePrice = (quantity: number, pricePerK: number) => {
    const rub = (quantity * pricePerK) / 1000;
    const ton = rub / TON_TO_RUB;
    return { rub, ton };
};