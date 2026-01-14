# 📦 Documentação – Pix, Webhook e Área “Meus Acessos”

Projeto: Mix Campeão  
Stack: Node.js 22 + Express + PostgreSQL + Docker + Nginx  
Ambiente: Produção (VPS Contabo)

## 1️⃣ Visão Geral do Fluxo

O sistema permite a venda de acesso único a segmentos (ex: Açaí) via Pix, com:

- Criação de cobrança Pix
- Confirmação automática via webhook
- Liberação imediata do acesso
- Área logada “Meus acessos” para o usuário

Fluxo resumido:

Usuário → Compra Pix → Gateway Pix  
→ Webhook → API  
→ Banco atualiza status  
→ Acesso liberado

## 2️⃣ Estrutura de Rotas Envolvidas

### 🔐 Autenticação

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### 🧾 Segmentos

- GET /api/segments
- GET /api/segments/:slug

### 💳 Pagamentos Pix

- POST /api/payments/pix/create
- POST /api/payments/pix/webhook

### 👤 Área do Usuário

- GET /api/me/segments

## 3️⃣ Modelo de Dados (Banco de Dados)

### Tabela `segments`

- id UUID PK
- code TEXT
- slug TEXT
- name TEXT
- price_pix NUMERIC
- active BOOLEAN

### Tabela `users`

- id UUID PK
- email TEXT UNIQUE
- password_hash TEXT
- role TEXT

### Tabela `purchases`

- id UUID PK
- user_id UUID FK → users.id
- segment_id UUID FK → segments.id
- status TEXT -- pending | paid | canceled
- provider TEXT -- efi | mercadopago | etc
- provider_reference TEXT
- created_at TIMESTAMPTZ
- paid_at TIMESTAMPTZ

## 4️⃣ Variáveis de Ambiente (.env)

Arquivo: api/.env

```
NODE_ENV=production
PORT=3333

DATABASE_URL=postgresql://mix:mix@db:5432/mixcampeao
JWT_SECRET=uma_chave_forte_aqui

# Admin seed
ADMIN_EMAIL=admin@mixcampeao.com
ADMIN_PASSWORD=senha_segura

# Pix Provider
PIX_PROVIDER=efi

EFI_CLIENT_ID=xxxxxxxx
EFI_CLIENT_SECRET=xxxxxxxx
EFI_CERT_PATH=/app/api/certs/efi-prod.p12
EFI_SANDBOX=false

PIX_WEBHOOK_SECRET=segredo_webhook
PUBLIC_WEBHOOK_BASE_URL=http://SEU_IP_PUBLICO
```

## 5️⃣ Criação de Cobrança Pix

### Endpoint

POST /api/payments/pix/create

### Autenticação

Obrigatória (JWT Bearer Token)

### Payload

```json
{
  "segmentId": "uuid-do-segmento"
}
```

### Processo Interno

- Valida usuário autenticado
- Cria registro em purchases com status pending
- Solicita cobrança ao gateway Pix
- Salva provider_reference
- Retorna QR Code

### Response

```json
{
  "purchaseId": "uuid",
  "qrCodeText": "00020126...",
  "qrCodeImage": "base64..."
}
```

## 6️⃣ Webhook de Confirmação Pix

### Endpoint

POST /api/payments/pix/webhook

### Origem

Gateway Pix (Efí / Mercado Pago / etc)

### Responsabilidades

- Validar assinatura / token do webhook
- Identificar a cobrança (provider_reference)
- Confirmar pagamento
- Atualizar purchases.status = 'paid'
- Registrar paid_at

### Resposta

HTTP/1.1 200 OK

O webhook não exige autenticação JWT, apenas validação do segredo.

## 7️⃣ Liberação de Acesso

O acesso é liberado automaticamente quando:

- purchases.status = 'paid'

Essa regra é aplicada exclusivamente no backend.

## 8️⃣ Área “Meus Acessos”

### Endpoint

GET /api/me/segments

### Autenticação

Obrigatória (JWT)

### Lógica

Busca todos os segmentos onde:

- purchases.user_id = user.id
- purchases.status = 'paid'

### Response

```json
{
  "segments": [
    {
      "id": "...",
      "slug": "acai",
      "name": "Açaí"
    }
  ]
}
```

## 9️⃣ Frontend – Regras de Exibição

Página /s/:slug

- Se não logado → mostra oferta
- Se logado + sem acesso → mostra Pix
- Se logado + acesso liberado → mostra conteúdo

Página /me

- Lista segmentos retornados de /api/me/segments
- Botão “Acessar”

## 🔟 Build e Deploy (Produção)

### Build do Front

`npm run build`

Gera:

- dist/
  - index.html
  - assets/

## 1️⃣1️⃣ Docker Compose (Produção)

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: mix
      POSTGRES_PASSWORD: mix
      POSTGRES_DB: mixcampeao
    volumes:
      - mixcampeao_db:/var/lib/postgresql/data
    restart: unless-stopped

  api:
    build:
      context: .
      dockerfile: api/Dockerfile
    env_file:
      - api/.env
    depends_on:
      - db
    ports:
      - "127.0.0.1:3333:3333"
    restart: unless-stopped

volumes:
  mixcampeao_db:
```

## 1️⃣2️⃣ Nginx (Multi-sites preparado)

```nginx
server {
  listen 80;
  server_name SEU_IP_PUBLICO;

  root /srv/sites/mixcampeao/app/MixCampeao/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3333;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

## 1️⃣3️⃣ Checklist Final

- API rodando
- Banco migrado
- Seed aplicado
- Pix integrado
- Webhook funcional
- Área “Meus acessos”
- Front buildado
- Estrutura pronta para múltiplos sites
- SSL (certbot) – próximo passo

## 🚀 Observação Importante

Esta arquitetura:

- Suporta múltiplos sites
- Permite trocar gateway Pix sem refatorar o sistema
- Mantém regras de acesso seguras no backend
- Está pronta para domínio próprio e HTTPS

