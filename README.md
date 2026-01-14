# Mix Campeão

App full-stack (Vite + React no frontend, Express + Postgres no backend) para vender segmentos com liberação via Pix e relatório de compra.

## Rodando local

1) Suba o banco (Postgres em `localhost:5433`)

```bash
docker compose up -d
```

2) Configure o `.env`

Crie `.env` na raiz baseado em `.env.example`.

Variáveis usadas em runtime:

- `DATABASE_URL`
- `JWT_SECRET`
- `PSP_WEBHOOK_SECRET`

Variáveis usadas no seed:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

3) Migrações + seed

```bash
npm run db:migrate
npm run db:seed
```

4) Rode o app

```bash
npm run dev
```

URLs:

- Web: `http://localhost:5174/` (porta pode variar)
- API: `http://localhost:3001/api/health`

## Build de produção

Gera o build do frontend em `dist/`:

```bash
npm run build
```

## Deploy (Vercel)

O projeto está preparado para deploy na Vercel:

- Frontend estático: build do Vite
- API serverless: `api/index.ts`

Configure as variáveis de ambiente no projeto da Vercel:

- `DATABASE_URL` (Postgres gerenciado: Neon/Supabase/RDS etc.)
- `JWT_SECRET`
- `PSP_WEBHOOK_SECRET`

Depois rode as migrações apontando para o banco de produção (localmente, com o `DATABASE_URL` de produção):

```bash
npm run db:migrate
```

Opcionalmente, rode seed em produção apenas se você quiser criar o admin inicial:

```bash
npm run db:seed
```
