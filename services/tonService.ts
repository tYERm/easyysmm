import { TON_WALLET } from "./data";

// Public TonAPI endpoint (Rate limited, but works for testing/low volume)
// For production, you should use an API Key: https://tonapi.io
const BASE_URL = "https://tonapi.io/v2/blockchain";

export interface VerificationResult {
  verified: boolean;
  message?: string;
  txHash?: string;
}

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

export const sendOrderToBot = (order: any) => {
  if ((window as any).Telegram?.WebApp) {
    const tg = (window as any).Telegram.WebApp;
    
    const payload = {
      type: 'order_paid',
      service_id: order.serviceId, // IMPORTANT: Added service_id
      service: order.serviceName,
      url: order.url,
      quantity: order.quantity,
      amount_ton: order.amountTon,
      amount_rub: order.amountRub,
      memo: order.memo,
      timestamp: new Date().toISOString()
    };

    tg.sendData(JSON.stringify(payload));
  }
};