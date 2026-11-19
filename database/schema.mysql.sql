-- Brasil Tourist Companion – schema MySQL (produção / Hostinger)
-- Base: DDL do PRD v2.1 + adições necessárias para auth (role, refresh_tokens,
-- email_verifications, rate_limits, terms_version). Todas as datas em UTC.

SET NAMES utf8mb4;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    country_of_origin VARCHAR(50) DEFAULT 'US',
    preferred_language VARCHAR(5) DEFAULT 'en',
    premium_until DATETIME NULL,
    stripe_customer_id VARCHAR(100) NULL,
    email_verified_at DATETIME NULL,
    terms_accepted_at DATETIME NULL,
    privacy_accepted_at DATETIME NULL,
    terms_version VARCHAR(20) NULL,
    marketing_opt_in TINYINT(1) DEFAULT 0,
    last_login_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_stripe_customer (stripe_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    stripe_session_id VARCHAR(100) NULL,
    stripe_subscription_id VARCHAR(100) NULL,
    stripe_payment_intent_id VARCHAR(100) NULL,
    stripe_price_id VARCHAR(100) NOT NULL,
    plan_type ENUM('day_pass','trip_pass','monthly','annual') NOT NULL,
    status ENUM('active','canceled','past_due','expired','refunded') DEFAULT 'active',
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    current_period_start DATETIME NOT NULL,
    current_period_end DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_purchases_user_status (user_id, status),
    INDEX idx_purchases_subscription (stripe_subscription_id),
    INDEX idx_purchases_payment_intent (stripe_payment_intent_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE phrasebook (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('general','dining','transport','emergency','shopping','health') NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE phrasebook_translations (
    phrase_id INT NOT NULL,
    lang VARCHAR(5) NOT NULL,
    phrase_text VARCHAR(255) NOT NULL,
    phonetic VARCHAR(255) NULL,      -- guia de pronúncia do texto em PT para falantes deste idioma
    audio_url VARCHAR(255) NULL,     -- usado na linha 'pt'
    PRIMARY KEY (phrase_id, lang),
    FOREIGN KEY (phrase_id) REFERENCES phrasebook(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    destination_region ENUM('rio','saopaulo','nordeste','amazonia','pantanal','sul','centro_oeste','sudeste_interior') NOT NULL,
    is_premium TINYINT(1) DEFAULT 0,
    duration_days INT NOT NULL,
    is_published TINYINT(1) DEFAULT 0,
    content_updated_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE itinerary_translations (
    itinerary_id INT NOT NULL,
    lang VARCHAR(5) NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    content_json JSON NOT NULL,
    PRIMARY KEY (itinerary_id, lang),
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_password_resets_token (token_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email_verifications_token (token_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_refresh_tokens_token (token_hash),
    INDEX idx_refresh_tokens_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE rate_limits (
    rl_key CHAR(64) PRIMARY KEY,      -- sha256 da chave (ex.: login|ip|email)
    hits INT NOT NULL,
    window_start DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payment_webhooks_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(100) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload_json JSON NOT NULL,
    processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE concierge_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    destination VARCHAR(100) NOT NULL,
    travel_dates VARCHAR(100) NULL,
    travelers_count INT NOT NULL DEFAULT 1,
    budget_level ENUM('budget', 'moderate', 'luxury') NOT NULL DEFAULT 'moderate',
    interests VARCHAR(255) NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'in_review', 'answered') NOT NULL DEFAULT 'pending',
    response_text TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    answered_at DATETIME NULL,
    INDEX idx_concierge_user (user_id),
    INDEX idx_concierge_status (status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

