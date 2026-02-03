-- ЭТОТ ФАЙЛ НУЖНО ЗАГРУЗИТЬ В ВАШУ БАЗУ ДАННЫХ (PostgreSQL) НА СЕРВЕРЕ --

-- 1. Таблица Пользователей
CREATE TABLE users (
    id BIGINT PRIMARY KEY, -- Telegram ID
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    photo_url TEXT,
    language_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица Кошельков (Привязка к пользователю)
CREATE TABLE wallets (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    address VARCHAR(255) NOT NULL,
    wallet_app VARCHAR(50) DEFAULT 'Tonkeeper',
    is_connected BOOLEAN DEFAULT TRUE,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_wallet UNIQUE (user_id)
);

-- 3. Таблица Заказов
CREATE TABLE orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    service_id INT NOT NULL,
    service_name VARCHAR(255),
    target_url TEXT NOT NULL,
    quantity INT NOT NULL,
    amount_ton DECIMAL(18, 9) NOT NULL, -- Точность для крипто
    amount_rub DECIMAL(10, 2),
    memo_id INT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Таблица Статистики (Агрегированная, чтобы не считать каждый раз)
CREATE TABLE user_stats (
    user_id BIGINT PRIMARY KEY REFERENCES users(id),
    total_spent_ton DECIMAL(18, 9) DEFAULT 0,
    total_orders INT DEFAULT 0,
    stat_subscribers INT DEFAULT 0,
    stat_views INT DEFAULT 0,
    stat_reactions INT DEFAULT 0,
    stat_bot_users INT DEFAULT 0
);

-- Индексы для ускорения поиска
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
