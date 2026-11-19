# Guia de Deploy – Hostinger + Stripe (Produção)

Este projeto foi estruturado para rodar em **hospedagem compartilhada (Hostinger)** usando apenas **Apache + PHP 8.1+ (cURL/PDO_MySQL) + MySQL**, sem depender de Node.js ou Composer.

---

## 1. Estrutura de Pastas na Hostinger (hPanel)

No Gerenciador de Arquivos da Hostinger (ou via FTP/SFTP/SSH), acesse a pasta do seu domínio (ex.: `/home/u123456789/domains/seudominio.com/`):

```text
/home/u123456789/domains/seudominio.com/
├── private/          <-- Envie a pasta private/ AQUI (FORA de public_html!)
│   ├── config.php    <-- Criado a partir de private/config.example.php
│   ├── bootstrap.php
│   ├── routes.php
│   ├── controllers/
│   ├── lib/
│   ├── cli/
│   └── storage/      <-- Permissão 775 (logs e cache)
└── public_html/      <-- Envie TODO o conteúdo de public_html/ AQUI
    ├── .htaccess
    ├── index.html
    ├── manifest.webmanifest
    ├── sw.js
    ├── api/
    │   └── index.php
    └── assets/
```

> **Importante:** Como `public_html/api/index.php` carrega `require __DIR__ . '/../../private/bootstrap.php';`, manter `private/` no mesmo nível de `public_html/` funciona automaticamente e impede que qualquer pessoa acesse `config.php` ou logs pelo navegador.

---

## 2. Banco de Dados MySQL (hPanel → Bancos de Dados MySQL)

1. No hPanel da Hostinger, crie um banco MySQL (ex.: `u123456789_turismo`) e um usuário com senha forte.
2. Abra o **phpMyAdmin** nesse banco e importe os dois arquivos na ordem abaixo:
   1. `database/schema.mysql.sql` (cria todas as tabelas: `users`, `purchases`, `itineraries`, `phrasebook`, `concierge_requests`, `payment_webhooks_log`, etc.)
   2. `database/seed.sql` (popula as frases de sobrevivência e os **27 roteiros** — 1 por estado brasileiro + DF)

---

## 3. Configuração de Produção (`private/config.php`)

Copie `private/config.example.php` para `private/config.php` e preencha:

```php
return [
    'APP_ENV' => 'production',
    'APP_URL' => 'https://seudominio.com',
    'CORS_ORIGINS' => ['https://seudominio.com'],

    'DB' => [
        'driver' => 'mysql',
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u123456789_turismo',
        'user' => 'u123456789_admin',
        'pass' => 'SUA_SENHA_MYSQL',
        'charset' => 'utf8mb4',
    ],

    // Gere uma chave de 64 caracteres: php -r "echo bin2hex(random_bytes(32));"
    'JWT_SECRET' => 'COLE_AQUI_SUA_CHAVE_SECRETA_64_CHARS',

    'MAIL' => [
        'driver' => 'mail',
        'from' => 'no-reply@seudominio.com',
        'from_name' => 'Deep Brazil Tourist',
    ],

    'STRIPE_SECRET_KEY' => 'sk_live_...',      // ou sk_test_... para testes
    'STRIPE_WEBHOOK_SECRET' => 'whsec_...',    // obtido ao criar o Webhook no Stripe
    'PLANS' => [
        // Cole os Price IDs reais criados no seu Stripe Dashboard
    ],
];
```

---

## 4. Configuração do Stripe

1. No **Stripe Dashboard** (`Products → Add product`), crie seus produtos e copie o **Price ID** (`price_...`) de cada um para `PLANS` em `private/config.php`:
   - **Trip Pass (14 dias)**: pagamento único (`mode: 'payment'`)
   - **Assinatura Mensal**: recorrente mensal (`mode: 'subscription'`)
   - **Passe Anual**: recorrente anual (`mode: 'subscription'`)
2. Vá em **Developers → Webhooks → Add endpoint**:
   - **Endpoint URL**: `https://seudominio.com/api/stripe-webhook`
   - **Events to listen to**:
     - `checkout.session.completed`
     - `invoice.paid`
     - `customer.subscription.deleted`
     - `charge.refunded`
   - Copie o **Signing secret** (`whsec_...`) e cole em `STRIPE_WEBHOOK_SECRET` no `private/config.php`.
3. (Opcional) Em **Settings → Billing → Customer portal**, ative o portal do cliente para permitir que assinantes cancelem ou baixem faturas pelo botão na tela Minha Conta.

---

## 5. Checklist Pós-Deploy

- [ ] Testar `https://seudominio.com/api/health` → deve retornar `{"status":"ok",...}`.
- [ ] Testar `https://seudominio.com/api/payments/plans` → deve retornar `"stripe_configured": true`.
- [ ] Criar sua conta no app e promovê-la a Admin via SSH (`php private/cli/make-admin.php seu@email.com`) ou SQL (`UPDATE users SET role='admin' WHERE email='seu@email.com';`).
- [ ] Fazer uma compra teste com cartão `4242 4242 4242 4242` em modo Test do Stripe e conferir o log em `#/admin` → Compras/Webhooks.

---

## 6. Solução de Problemas (erro 500 em `/api/*`)

Gere/atualize os pacotes com `powershell -File deploy\build-packages.ps1` (cria `deploy\public_html.zip` e `deploy\private.zip`).
Abra `https://seudominio.com/api/health` — a resposta agora indica a causa:

| Resposta de `/api/health` | Causa | Correção |
|---|---|---|
| `private_not_found` | A pasta `private/` não foi enviada (ou está em outro nível) | Extraia `private.zip` **ao lado** de `public_html/` (mesmo nível), não dentro dela |
| `config_missing` | Falta `private/config.php` | Copie `config.example.php` para `config.php` e preencha (banco MySQL, `APP_ENV=production`, `JWT_SECRET`) |
| `jwt_secret_weak` | `JWT_SECRET` com menos de 32 caracteres | Gere: `php -r "echo bin2hex(random_bytes(32));"` |
| `php_version_unsupported` | PHP < 8.1 | hPanel → Avançado → Configuração do PHP → 8.2 ou superior |
| `bootstrap_failed` | Erro ao iniciar (ex.: extensão ausente) | Ver `private/storage/logs/app.log` |
| `{"status":"ok"}` mas rotas com 500 | Banco MySQL sem tabelas/credenciais erradas | Importar `schema.mysql.sql` + `seed.sql` e conferir `DB` no `config.php` |

> O `private.zip` **não inclui** `config.php` (segredos) nem o banco SQLite local. Crie o `config.php` de produção diretamente no servidor.
