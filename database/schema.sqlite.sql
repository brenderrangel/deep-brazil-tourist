-- Brasil Tourist Companion – schema SQLite (apenas desenvolvimento local).
-- Espelha database/schema.mysql.sql. ENUM -> CHECK, JSON -> TEXT.
-- updated_at é gravado pela aplicação (SQLite não tem ON UPDATE).

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    country_of_origin TEXT DEFAULT 'US',
    preferred_language TEXT DEFAULT 'en',
    premium_until TEXT NULL,
    stripe_customer_id TEXT NULL,
    email_verified_at TEXT NULL,
    terms_accepted_at TEXT NULL,
    privacy_accepted_at TEXT NULL,
    terms_version TEXT NULL,
    marketing_opt_in INTEGER DEFAULT 0,
    last_login_at TEXT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_stripe_customer ON users (stripe_customer_id);

CREATE TABLE purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    stripe_session_id TEXT NULL,
    stripe_subscription_id TEXT NULL,
    stripe_payment_intent_id TEXT NULL,
    stripe_price_id TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('day_pass','trip_pass','monthly','annual')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','expired','refunded')),
    currency TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    current_period_start TEXT NOT NULL,
    current_period_end TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_purchases_user_status ON purchases (user_id, status);
CREATE INDEX idx_purchases_subscription ON purchases (stripe_subscription_id);
CREATE INDEX idx_purchases_payment_intent ON purchases (stripe_payment_intent_id);

CREATE TABLE phrasebook (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL CHECK (category IN ('general','casual','dining','transport','emergency','shopping','health')),
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE phrasebook_translations (
    phrase_id INTEGER NOT NULL REFERENCES phrasebook(id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    phrase_text TEXT NOT NULL,
    phonetic TEXT NULL,
    audio_url TEXT NULL,
    PRIMARY KEY (phrase_id, lang)
);

CREATE TABLE itineraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    destination_region TEXT NOT NULL CHECK (destination_region IN ('rio','saopaulo','nordeste','amazonia','pantanal','sul','centro_oeste','sudeste_interior')),
    is_premium INTEGER DEFAULT 0,
    duration_days INTEGER NOT NULL,
    is_published INTEGER DEFAULT 0,
    content_updated_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE itinerary_translations (
    itinerary_id INTEGER NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
    lang TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    content_json TEXT NOT NULL,
    PRIMARY KEY (itinerary_id, lang)
);

CREATE TABLE password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT NULL,
    user_agent TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE rate_limits (
    rl_key TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    window_start TEXT NOT NULL
);

CREATE TABLE payment_webhooks_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE concierge_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    travel_dates TEXT NULL,
    travelers_count INTEGER NOT NULL DEFAULT 1,
    budget_level TEXT NOT NULL DEFAULT 'moderate' CHECK (budget_level IN ('budget', 'moderate', 'luxury')),
    interests TEXT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'answered')),
    response_text TEXT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at TEXT NULL
);
CREATE INDEX idx_concierge_user ON concierge_requests (user_id);
CREATE INDEX idx_concierge_status ON concierge_requests (status);

