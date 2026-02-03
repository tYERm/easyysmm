import { TON_WALLET } from "./data";

// Public TonAPI endpoint (Rate limited, but works for testing/low volume)
// For production, you should use an API Key: https://tonapi.io
const BASE_URL = "https://tonapi.io/v2/blockchain";

export interface VerificationResult {
  verified: boolean;
  message?: string;
  txHash?: string;
}

/**
 * Проверка платежа через TON API
 * @param expectedMemo - ожидаемый комментарий (MEMO)
 * @param expectedAmountTon - ожидаемая сумма в TON
 */
export const verifyPayment = async (
  expectedMemo: string, 
  expectedAmountTon: number
): Promise<VerificationResult> => {
  try {
    // Fetch last 20 transactions for the wallet
    const response = await fetch(`${BASE_URL}/accounts/${TON_WALLET}/transactions?limit=20`);
    
    if (!response.ok) {
      return { verified: false, message: "Ошибка API или лимит запросов. Попробуйте через 5 сек." };
    }

    const data = await response.json();
    const transactions = data.transactions;

    if (!transactions || transactions.length === 0) {
      return { verified: false, message: "Транзакции не найдены." };
    }

    // Look for a matching transaction
    const match = transactions.find((tx: any) => {
      const inMsg = tx.in_msg;
      
      // 1. Must be an incoming message
      if (!inMsg || inMsg.destination?.address !== TON_WALLET) return false;

      // 2. Check value (allow small difference for gas fees if needed, but exact is better)
      const nanoTon = Number(inMsg.value);
      const tonValue = nanoTon / 1000000000;
      
      // Check if value is within 0.05 TON margin (users might mistake slightly) or exact
      const isAmountValid = Math.abs(tonValue - expectedAmountTon) < 0.05;

      // 3. Check Memo (Comment)
      // TonAPI usually decodes the body.text
      const comment = inMsg.decoded_body?.text || "";
      const isMemoValid = comment.includes(expectedMemo);

      return isAmountValid && isMemoValid;
    });

    if (match) {
      return { 
        verified: true, 
        txHash: match.hash 
      };
    }

    return { 
      verified: false, 
      message: "Транзакция не найдена. Убедитесь, что отправили точную сумму с правильным комментарием." 
    };

  } catch (error) {
    console.error("Verification error:", error);
    return { verified: false, message: "Ошибка сети при проверке платежа." };
  }
};

/**
 * Отправка данных заказа боту через Telegram WebApp API
 * @param order - объект заказа
 */
export const sendOrderToBot = (order: any) => {
  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    
    // Формируем полный payload с всеми необходимыми данными
    const payload = {
      type: 'order_paid',
      service_id: order.serviceId,
      service: order.serviceName,
      url: order.url,
      quantity: order.quantity,
      amount_ton: order.amountTon,
      amount_rub: order.amountRub,
      memo: order.memo,
      timestamp: new Date().toISOString()
    };

    console.log('Отправка данных боту:', payload);

    try {
      // Отправляем данные боту
      tg.sendData(JSON.stringify(payload));
      
      // Логируем успешную отправку
      console.log('Данные успешно отправлены боту');
      
      // Показываем haptic feedback
      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      
      // Закрываем WebApp после небольшой задержки
      setTimeout(() => {
        tg.close();
      }, 1000);
      
    } catch (error) {
      console.error('Ошибка отправки данных боту:', error);
      
      // Показываем ошибку пользователю
      if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
      }
      
      tg.showAlert('Ошибка отправки данных. Пожалуйста, обратитесь в поддержку.');
    }
  } else {
    console.error('Telegram WebApp API недоступен');
    alert('Ошибка: WebApp должен быть открыт из Telegram');
  }
};

/**
 * Проверка доступности Telegram WebApp API
 */
export const isTelegramWebApp = (): boolean => {
  return !!(window as any).Telegram?.WebApp;
};

/**
 * Получение данных пользователя из Telegram
 */
export const getTelegramUser = () => {
  if ((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
    return (window as any).Telegram.WebApp.initDataUnsafe.user;
  }
  return null;
};

/**
 * Инициализация Telegram WebApp
 */
export const initTelegramWebApp = () => {
  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    
    // Расширяем WebApp на весь экран
    tg.expand();
    
    // Включаем подтверждение закрытия
    tg.enableClosingConfirmation();
    
    // Устанавливаем цвета темы
    tg.setHeaderColor('#05010a');
    tg.setBackgroundColor('#05010a');
    
    // Показываем главную кнопку если нужно
    tg.MainButton.hide();
    
    console.log('Telegram WebApp инициализирован');
    console.log('Пользователь:', getTelegramUser());
    
    return tg;
  }
  
  console.warn('Telegram WebApp API недоступен');
  return null;
};
