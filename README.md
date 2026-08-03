# SpotQ Queue Service

The **SpotQ Queue Service** is a high-performance, production-ready backend service designed to manage customer queues, waitlists, real-time queue lifecycles, and queue status tracking. 

Built using **TypeScript**, **Express 5**, **Clean Architecture**, and modern observability practices, this service ensures resilience, low latency, and comprehensive system insights.

---

## 🛠️ Technology Stack
- **Runtime & Language:** Node.js (v22+), Express 5, TypeScript (v7+)
- **ORM & Database:** Prisma 7 with PostgreSQL (configured via `@prisma/adapter-pg` driver adapter)
- **Caching & Pub/Sub:** Redis (using `redis` client)
- **Secret Management:** Infisical CLI (for secure environment variable injections)
- **Log Management:** Pino Logger (configured with native `AsyncLocalStorage` request-context tracking)
- **Monitoring & Metrics:** `prom-client` (exposing system, network, and connectivity metrics)
- **Quality & Formatters:** Biome (for lightning-fast linting and code formatting)
- **Testing:** Jest with `@swc/jest` compiler (highly optimized for TS7 ESM)
- **Package Manager:** `pnpm` (v11+)

---

## 🏗️ System Architecture
The codebase strictly follows **Clean Architecture** patterns:
- **`src/domain/`**: Represents core business rules, entities, and interfaces (independent of external libraries).
- **`src/application/`**: Contains use-cases and business workflows coordinating data between controllers and domain objects.
- **`src/infrastructure/`**: Details concrete adapters for external systems (Database connection, Redis state, Metrics registry, Pino Logger configurations).
- **`src/presentation/`**: Manages HTTP entrypoints, Express routes, and middlewares (validation, logger mapping, metrics tracking).
- **`src/modules/`**: Hosts cohesive feature domains (such as the modular `health` check domain).

---

## 🚀 Key Features

### 1. Production-Ready Health Monitoring (`GET /health`)
Exposes the status of the service and its underlying database and caching dependencies:
```json
{
  "status": "UP",
  "timestamp": "2026-08-03T21:00:48.143Z",
  "checks": {
    "application": "UP",
    "database": "UP",
    "redis": "UP"
  }
}
```
- **Database Connection Check:** Evaluates raw connection pooling state using Prisma's `SELECT 1`.
- **Redis Connection Check:** Queries latency status via `PING` -> `PONG`.
- **HTTP Status Codes:** Returns `200 OK` when all systems are healthy, and `503 Service Unavailable` if any checks return `DOWN`.

### 2. Structured JSON Logging with Trace Correlation
Every log message is outputted in structured JSON via **Pino** and automatically correlates with the incoming HTTP request context using Node's native **`AsyncLocalStorage`**:
- **Automatic Headers:** Every response returns `x-request-id` (unique tracking uuid) and `x-correlation-id` (forwarded microservice tracking identifier).
- **Auto-injected Fields:** Every log statement emitted during the request automatically contains `"requestId"` and `"correlationId"`.
- **Formatting:** Log levels are standardized to uppercase (e.g. `INFO`, `ERROR`) and timestamps use standardized ISO strings.
- **Stack Traces:** Errors logged via `logger.error` are automatically serialized to include the error name, message, and structured stack trace.

### 3. Prometheus Observability Metrics (`GET /metrics`)
Exposes runtime metrics compiled in the standard Prometheus exposition format:
- **Process Metrics:** Default Node.js system gauges (CPU usage, resident memory bytes, event loop lag percentiles, active handles/requests).
- **Request Volume (`http_requests_total`):** Counters tracking HTTP status rates, methods, and matched Express routes.
- **Request Latency (`http_request_duration_seconds`):** Histograms measuring response times.
- **Dependency State (`database_up` / `redis_up`):** Gauges measuring active connection status (1 for connected, 0 for disconnected) evaluated dynamically during scraper polls.

### 4. Secure Secrets Management (Infisical CLI)
Environment credentials (like DB connection proxies and Redis passwords) are kept completely out of the codebase and Git history:
- In production, secrets are fetched dynamically at boot and injected into the Node process using the **Infisical CLI**: `infisical run -- <command>`.
- In local development, the configuration seamlessly falls back to reading standard `.env` values when Infisical credentials are not present.

---

## ⚡ Getting Started

### 1. Prerequisites
- Install **Node.js** (v22+)
- Install **pnpm** (v11+)
- Install the **Infisical CLI** (optional for local fallback mode, required for syncing workspace keys)

### 2. Setup Dependencies & Services
```bash
# Clone the repository and install packages
pnpm install

# Start the local Prisma Postgres development server
pnpm exec prisma dev start default

# Start your local Redis instance
brew services start redis
```

### 3. Generate Prisma Client
```bash
pnpm run prisma:generate
```

### 4. Running the Application
- **Local Fallback Mode (Using `.env` values):**
  ```bash
  pnpm run dev
  ```
- **Infisical Mode (Syncing secrets from workspace):**
  ```bash
  infisical run --env=dev -- pnpm run dev
  ```

---

## 🧪 Testing & Validation

### Run Unit Tests
Unit tests use Jest compiled via SWC for speed:
```bash
pnpm test
```

### Formatting and Linting Checks
Biome handles styling and static checks. To audit the codebase:
```bash
pnpm run lint
```
To automatically apply Biome's formatting fixes:
```bash
pnpm run format
```

---

## 🐳 Docker Deployment
The service includes a multi-stage `Dockerfile` optimized for minimal production image footprint:

- **Build Stage:** Installs dev dependencies, generates the Prisma client binaries, and compiles TypeScript source code.
- **Production Stage:** Prunes dev dependencies, installs the **Infisical CLI** for secure runtime injections, switches to a non-root `appuser` for security, and configures a Docker healthcheck using `wget` against `/health`.

### Start the Container Cluster
```bash
# Spins up Postgres, Redis, and the Queue Service container locally
docker-compose up -d --build
```
