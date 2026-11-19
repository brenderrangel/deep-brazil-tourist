<?php
// Copie para private/config.php e ajuste. NUNCA versione o config.php.
// Em produção (Hostinger), a pasta private/ fica FORA do public_html.
return [
    'APP_ENV' => 'local',                       // local | production
    'APP_URL' => 'http://localhost:8000',       // URL pública do PWA (usada nos e-mails)
    'CORS_ORIGINS' => ['http://localhost:8000'],

    'DB' => [
        'driver' => 'sqlite',                   // sqlite (local) | mysql (Hostinger)
        'sqlite_path' => __DIR__ . '/storage/database.sqlite',
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'CHANGE_ME',
        'user' => 'CHANGE_ME',
        'pass' => 'CHANGE_ME',
        'charset' => 'utf8mb4',
    ],

    // Gere com: php -r "echo bin2hex(random_bytes(32));"
    'JWT_SECRET' => 'dev-only-change-me-dev-only-change-me-0123456789',
    'JWT_TTL' => 900,                           // 15 min
    'REFRESH_TTL' => 60 * 60 * 24 * 30,         // 30 dias

    'TERMS_VERSION' => '2026-11-01',
    'SUPPORTED_LANGS' => ['en', 'es', 'pt'],

    'MAIL' => [
        'driver' => 'log',                      // log (grava em storage/logs/mail.log) | mail
        'from' => 'no-reply@example.com',
        'from_name' => 'Brasil Tourist Companion',
    ],

    // Pagamentos – Stripe (preencha com as chaves do Dashboard Stripe)
    'STRIPE_SECRET_KEY' => '',                  // sk_test_... ou sk_live_...
    'STRIPE_WEBHOOK_SECRET' => '',              // whsec_...
    'PLANS' => [
        // Substitua as chaves price_... pelos IDs de Preço criados no seu Stripe Dashboard:
        'price_trip_pass_14d' => [
            'type' => 'trip_pass',
            'days' => 14,
            'mode' => 'payment',
            'currency' => 'USD',
            'amount' => 9.90,
            'badge' => 'Mais Popular',
            'label' => [
                'pt' => 'Trip Pass · 14 dias',
                'en' => 'Trip Pass · 14 days',
                'es' => 'Trip Pass · 14 días',
            ],
        ],
        'price_monthly_pro' => [
            'type' => 'monthly',
            'days' => 30,
            'mode' => 'subscription',
            'currency' => 'USD',
            'amount' => 14.90,
            'badge' => null,
            'label' => [
                'pt' => 'Assinatura Mensal',
                'en' => 'Monthly Subscription',
                'es' => 'Suscripción Mensual',
            ],
        ],
        'price_annual_pro' => [
            'type' => 'annual',
            'days' => 365,
            'mode' => 'subscription',
            'currency' => 'USD',
            'amount' => 59.00,
            'badge' => 'Economize 67%',
            'label' => [
                'pt' => 'Passe Anual',
                'en' => 'Annual Pass',
                'es' => 'Pase Anual',
            ],
        ],
    ],
];

