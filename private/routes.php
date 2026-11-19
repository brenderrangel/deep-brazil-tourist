<?php
declare(strict_types=1);

$r = new Router();

$r->get('/api/health', static fn () => ['status' => 'ok', 'time' => gmdate('c')]);

// Autenticação
$r->post('/api/auth/register', [AuthController::class, 'register']);
$r->post('/api/auth/login', [AuthController::class, 'login']);
$r->post('/api/auth/refresh', [AuthController::class, 'refresh']);
$r->post('/api/auth/logout', [AuthController::class, 'logout']);
$r->post('/api/auth/verify-email', [AuthController::class, 'verifyEmail']);
$r->post('/api/auth/resend-verification', [AuthController::class, 'resendVerification']);
$r->post('/api/auth/forgot-password', [AuthController::class, 'forgotPassword']);
$r->post('/api/auth/reset-password', [AuthController::class, 'resetPassword']);

// Conta (LGPD/GDPR)
$r->get('/api/me', [MeController::class, 'show']);
$r->put('/api/me', [MeController::class, 'update']);
$r->delete('/api/me', [MeController::class, 'destroy']);
$r->get('/api/me/export', [MeController::class, 'export']);

// Conteúdo
$r->get('/api/phrasebook', [ContentController::class, 'phrasebook']);
$r->get('/api/itineraries', [ContentController::class, 'itineraries']);
$r->get('/api/itineraries/{id}', [ContentController::class, 'itinerary']);

// Módulos 3, 4 e 5 (Desembarque, Câmbio e Entrada/Saúde)
$r->get('/api/rates', [RatesController::class, 'getRates']);
$r->get('/api/guides/arrival', [GuidesController::class, 'arrival']);
$r->get('/api/guides/entry-health', [GuidesController::class, 'entryHealth']);
$r->get('/api/food-guide', [FoodController::class, 'list']);

// Módulo 7 – Painel Administrativo (Acesso restrito: JWT com role="admin")
$r->get('/api/admin/stats', [AdminController::class, 'stats']);
$r->get('/api/admin/users', [AdminController::class, 'users']);
$r->get('/api/admin/phrases', [AdminController::class, 'listPhrases']);
$r->post('/api/admin/phrases', [AdminController::class, 'createPhrase']);
$r->put('/api/admin/phrases/{id}', [AdminController::class, 'updatePhrase']);
$r->delete('/api/admin/phrases/{id}', [AdminController::class, 'deletePhrase']);
$r->get('/api/admin/itineraries', [AdminController::class, 'listItineraries']);
$r->put('/api/admin/itineraries/{id}/publish', [AdminController::class, 'togglePublishItinerary']);
$r->get('/api/admin/purchases', [AdminController::class, 'purchases']);
$r->get('/api/admin/webhooks', [AdminController::class, 'webhookLogs']);
$r->get('/api/admin/concierge', [ConciergeController::class, 'adminList']);
$r->put('/api/admin/concierge/{id}/answer', [ConciergeController::class, 'adminAnswer']);

// Módulo 6 – Concierge Premium (Consultoria Assíncrona de Roteiros)
$r->get('/api/concierge/requests', [ConciergeController::class, 'myRequests']);
$r->post('/api/concierge/requests', [ConciergeController::class, 'createRequest']);

// Módulo 8 – Pagamentos e Assinaturas (Stripe)
$r->get('/api/payments/plans', [PaymentController::class, 'plans']);
$r->post('/api/payments/checkout', [PaymentController::class, 'checkout']);
$r->post('/api/payments/verify-session', [PaymentController::class, 'verifySession']);
$r->post('/api/payments/portal', [PaymentController::class, 'portal']);
$r->post('/api/stripe-webhook', [PaymentController::class, 'webhook']);

return $r;

