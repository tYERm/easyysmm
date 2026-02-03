-- Скопируйте этот код и выполните в SQL Editor в панели Neon Console

-- 1. Таблица Пользователей
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    photo_url TEXT,
    language_code VARCHAR(10),
    is_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица Кошельков
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    address VARCHAR(255) NOT NULL,
    wallet_app VARCHAR(50) DEFAULT 'Tonkeeper',
    is_connected BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- 3. Таблица Заказов
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    service_id INT NOT NULL,
    service_name VARCHAR(255),
    target_url TEXT NOT NULL,
    quantity INT NOT NULL,
    amount_ton DECIMAL(18, 9) NOT NULL,
    amount_rub DECIMAL(10, 2),
    memo_id INT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Таблица Статистики
CREATE TABLE IF NOT EXISTS user_stats (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    total_spent_ton DECIMAL(18, 9) DEFAULT 0,
    total_orders INT DEFAULT 0,
    stat_subscribers INT DEFAULT 0,
    stat_views INT DEFAULT 0,
    stat_reactions INT DEFAULT 0,
    stat_bot_users INT DEFAULT 0
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);