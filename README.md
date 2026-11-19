# Brasil Tourist Companion WebApp (PRD v2.1)

Progressive Web App (PWA) de assistência para turistas estrangeiros no Brasil, integrado a backend PHP REST e banco MySQL (Hostinger) com fallback SQLite local.

## 🚀 Como Rodar Localmente

Na raiz do projeto (`c:\Users\br0039321446\antigravity\Turismo`):

1. **Executar o script de desenvolvimento**:
   ```powershell
   .\dev-server.ps1
   ```
2. Abra o navegador em: [http://localhost:8000](http://localhost:8000)

*(O script usa o PHP embutido em `C:\php-8.5.12\php.exe` com o arquivo `php-local.ini` configurado especificamente para o projeto, sem alterar o sistema).*

---

## 🧪 Como Rodar os Testes Automatizados da API

Para executar a bateria de 36 testes de fumaça (registro, login, rate limiting, JWT, expiração, rotação de tokens, phrasebook, bloqueio de conteúdo premium no servidor, recuperação de senha, LGPD/GDPR):

```powershell
C:\php-8.5.12\php.exe -c php-local.ini tests\smoke.php
```

---

## 📁 Estrutura do Projeto

```text
├── database/
│   ├── schema.mysql.sql    # DDL de produção para o MySQL na Hostinger
│   ├── schema.sqlite.sql   # DDL de desenvolvimento local (SQLite)
│   └── seed.sql            # Dados iniciais multilíngues (fraselário, roteiros)
├── private/
│   ├── cli/                # Scripts utilitários CLI (make-admin.php, generate-icons.php)
│   ├── controllers/        # Controladores REST (Auth, Me, Content)
│   ├── lib/                # Bibliotecas puras (Router, Request, Response, JWT, RateLimiter, etc.)
│   ├── storage/            # Logs e banco SQLite local (ignorado no git)
│   ├── bootstrap.php       # Inicializador do backend
│   ├── config.example.php  # Modelo de configuração
│   └── routes.php          # Declaração das rotas /api/*
├── public_html/
│   ├── api/index.php       # Front controller da API REST
│   ├── assets/
│   │   ├── css/style.css   # Estilos mobile-first e temas
│   │   ├── i18n/           # Dicionários de tradução (en.json, es.json, pt.json)
│   │   ├── icons/          # Ícones do PWA
│   │   └── js/             # Vanilla ES Modules (Core e Views)
│   ├── .htaccess           # Configuração de segurança e URL rewrite da Hostinger
│   ├── index.html          # Entrada do PWA
│   ├── manifest.webmanifest# Manifesto de instalação PWA
│   └── sw.js               # Service Worker com cache offline somente leitura
├── dev-server.ps1          # Script para subir o servidor local
├── php-local.ini           # Configuração de extensões PHP para desenvolvimento local
└── router.php              # Roteador de fallback para o servidor embutido do PHP
```

---

## 🛠️ Próximas Fases (Conforme PRD v2.1)

- **Fase 3 – Pagamentos & Stripe**:
  - Configurar produtos/preços no Stripe Dashboard (USD, EUR, BRL) para Day Pass, Trip Pass e Mensal.
  - Endpoints `POST /api/payments/checkout` e `POST /api/payments/portal`.
  - Endpoint `POST /api/stripe-webhook` com verificação de assinatura e idempotência (`payment_webhooks_log`).
- **Fase 4 – Expansão de Conteúdo**:
  - Módulos 3, 4 e 5: Guias de desembarque aeroportuário (GRU, GIG, BSB, CNF), Cotação de moedas e Matriz de pagamentos, Requisitos de entrada e vacinas com fontes oficiais verificadas.
  - Painel administrativo para curadoria e atualização de conteúdos.

