import crypto from 'crypto';

interface ValidatedUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface ValidationResult {
  isValid: boolean;
  user?: ValidatedUser;
  error?: string;
}

export function validateTelegramWebAppData(initData: string): ValidationResult {
  if (!process.env.BOT_TOKEN) {
    return { isValid: false, error: 'Server misconfiguration: BOT_TOKEN missing' };
  }

  if (!initData) {
    return { isValid: false, error: 'No authorization data provided' };
  }

  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  if (!hash) {
    return { isValid: false, error: 'Hash missing' };
  }

  urlParams.delete('hash');

  // Sort keys alphabetically
  const params: string[] = [];
  urlParams.forEach((val, key) => params.push(`${key}=${val}`));
  params.sort();

  const dataCheckString = params.join('\n');
  
  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(process.env.BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  if (calculatedHash !== hash) {
    return { isValid: false, error: 'Invalid signature' };
  }

  // Check data age (prevent replay attacks) - 24 hours
  const authDate = Number(urlParams.get('auth_date'));
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > 86400) {
      return { isValid: false, error: 'Data is outdated' };
  }

  try {
    const userStr = urlParams.get('user');
    if (!userStr) return { isValid: false, error: 'User data missing' };
    const user = JSON.parse(userStr);
    return { isValid: true, user };
  } catch (e) {
    return { isValid: false, error: 'Failed to parse user data' };
  }
}

// Security Headers Helper
export function setSecurityHeaders(res: any) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    
    // Security
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
}