# Minimal Invoicing API

A small REST API for managing customers and invoices.

## Tech Stack

- Node.js 20+
- TypeScript
- Express 5
- Prisma 7
- PostgreSQL 16
- Zod
- Docker

## Requirements

- Node.js 20+
- Docker Desktop

## Setup

Clone the repository and install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create the environment files:

```bash
cp .env.example .env
cp .env.example .env.test
```

The .env file is ready for the local Docker PostgreSQL database.

For `.env.test`, change the database name from `invoicing` to `invoicing_test`.

Run the database migrations:

```bash
npx prisma migrate deploy
```

## Run the API

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start:

```bash
npm run start
```

The API runs at:

```text
http://localhost:3000
```

Health check:

```bash
curl http://localhost:3000/health
```

## Tests

Tests use a separate PostgreSQL database.

Create the test database once:

```bash
docker compose exec -T postgres psql -U parshav -d postgres -c "CREATE DATABASE invoicing_test;"
```

Apply the migrations to the test database:

```bash
DATABASE_URL="postgresql://parshav:flick@localhost:5432/invoicing_test?schema=public" npx prisma migrate deploy
```

Run all tests:

```bash
npm test
```

Run tests with coverage:

```bash
npm test -- --experimental-test-coverage
```

## Code Checks

```bash
npm run lint
npm run format:check
npx tsc --noEmit
npx prisma validate
```

## Architecture

The project follows a simple layered structure:

```text
Routes → Services → Prisma → PostgreSQL
```

Routes handle HTTP requests and validation. Services contain the main business logic. Prisma handles database access.

## API Endpoints

### Customers

```text
POST   /customers
GET    /customers
GET    /customers/:id
PATCH  /customers/:id
```

### Invoices

```text
POST   /invoices
GET    /invoices
GET    /invoices/:id
PATCH  /invoices/:id
DELETE /invoices/:id
POST   /invoices/:id/issue
POST   /invoices/:id/pay
POST   /invoices/:id/cancel
```

### Health

```text
GET /health
```
