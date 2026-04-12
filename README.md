# Fraud Detection Platform Backend

## Tech Stack

- Node.js + Express
- TypeScript
- Prisma ORM
- MySQL

---

## Setup Project

### 1. Install dependencies

```bash
npm install
```

### 2. Setup environment

Setup file `.env`.

### 3. Setup database

```sql
CREATE DATABASE fraud_detection_platform;
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Run migration

```bash
npm run prisma:migrate -- --name init
```

### 6. Run server

```bash
npm run dev
```

Server akan berjalan di:

```
http://localhost:8080
```
