#  SpotQ Queue Service

Queue Service is one of the core backend microservices of the SpotQ platform. It provides the foundational infrastructure required for implementing queue and waitlist-related business features while following the SpotQ engineering standards for scalability, security, observability, and maintainability.

---

# Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Implemented Foundation](#implemented-foundation)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Infisical Configuration](#infisical-configuration)
- [Available Scripts](#available-scripts)
- [Docker](#docker)
- [Health Endpoints](#health-endpoints)
- [Observability](#observability)
- [Project Architecture](#project-architecture)
- [Branching Strategy](#branching-strategy)
- [Coding Standards](#coding-standards)
- [CI Pipeline](#ci-pipeline)
- [Development Guidelines](#development-guidelines)
- [Future Enhancements](#future-enhancements)

---

# Overview

The Queue Service is responsible for managing customer queues, waitlist positioning, wait times, and queue lifecycles within the SpotQ ecosystem.

The current implementation provides only the service foundation and infrastructure.

Implemented:

- Express Application
- Clean Architecture
- TypeScript
- Prisma Configuration
- PostgreSQL Connection with secure TLS
- Redis Connection
- Structured Logging with Trace Correlation
- Prometheus Metrics
- Health Checks (dynamic dependency checks)
- Docker Support
- Infisical Secret Management

Not yet implemented:

- Queue & Waitlist APIs
- Business Logic (e.g. queue positioning algorithms)
- Authentication
- Authorization
- Event Publishing
- gRPC
- Domain Models

---

# Technology Stack

| Technology | Purpose |
|------------|----------|
| Node.js 22 | Runtime |
| Express.js 5 | HTTP Server |
| TypeScript 7 | Language |
| Prisma 7 | ORM |
| PostgreSQL | Database |
| Redis | Cache & Event Store |
| Pino | Structured Logging |
| Prometheus | Metrics |
| Biome | Linting & Formatting |
| pnpm | Package Manager |
| Docker | Containerization |
| Infisical | Secrets Management |
| GitHub Actions | Continuous Integration |

---

# Project Structure

```text
src/
│
├── application/
│
├── domain/
│
├── infrastructure/
│   ├── config/
│   ├── database/
│   ├── logger/
│   ├── metrics/
│   └── redis/
│
├── presentation/
│   ├── middleware/
│   └── routes/
│
├── app.ts
└── server.ts
```

---

# Implemented Foundation

## Configuration

- Infisical Integration
- Environment Validation (via Zod schema checks)
- Application Configuration (placed under `src/infrastructure/config/`)

---

## Database

- Prisma ORM
- PostgreSQL Connection (with Pg driver adapter)
- Reusable Prisma Client
- Database Connection Service
- Startup connection verification query (`SELECT 1`)
- Secure SSL/TLS validation with custom certificate authority input capability (`DATABASE_CA_CERT`)

---

## Redis

- Redis Cloud Integration
- Reusable Redis Client
- Connection Verification
- Pino-integrated event logging (connect, ready, reconnecting, errors)

---

## Logging

Structured JSON logging using Pino.

Includes:

- Timestamp (native ISO time)
- Log Level
- Service Name (`spotq-queue-service`)
- Tracing correlation (`requestId`, `correlationId`, `traceId`)
- Request Logging middleware
- Response Logging middleware
- Error Logging and serialization

---

## Metrics

Prometheus-compatible metrics.

Available metrics include:

- HTTP Request Count (labeled by method, route, and status code)
- HTTP Request Duration (histograms mapping response latency)
- Database Status (`database_up` status gauge)
- Redis Status (`redis_up` status gauge)
- Node.js Runtime Metrics (CPU, memory, process metrics via `prom-client`)

Endpoint:

```text
GET /metrics
```

---

# Prerequisites

Install:

- Node.js 22+
- pnpm (v11+)
- Docker Desktop
- Git
- Infisical CLI

Verify:

```bash
node -v
pnpm -v
docker --version
infisical --version
```

---

# Local Development Setup

Clone repository

```bash
git clone <repository-url>

cd spotq-queue-service
```

Install dependencies

```bash
pnpm install
```

Start development server

```bash
pnpm dev:infisical
```

*(Alternatively, run `pnpm dev` to fall back to the local `.env` configuration file, or run `infisical run --env=dev -- pnpm dev` manually).*

Build project

```bash
pnpm build
```

Run production build

```bash
node dist/server.js
```

---

# Infisical Configuration

Login

```bash
infisical login
```

Initialize

```bash
infisical init
```

Run application

```bash
pnpm dev:infisical
```

Required secrets

| Variable | Description |
|-----------|-------------|
| PORT | Application Port |
| NODE_ENV | Run Environment |
| SERVICE_NAME | Name of microservice |
| LOG_LEVEL | Logging granularity level |
| DATABASE_URL | PostgreSQL connection string URL |
| REDIS_URL | Redis URL |

---

# Available Scripts

Install

```bash
pnpm install
```

Development (Local Env)

```bash
pnpm dev
```

Development (Infisical Vault)

```bash
pnpm dev:infisical
```

Build

```bash
pnpm build
```

Start

```bash
pnpm start
```

Lint

```bash
pnpm lint
```

Format

```bash
pnpm format
```

Test (Local Env)

```bash
pnpm test
```

Test (with Infisical)

```bash
pnpm test:infisical
```

---

# Docker

Build image

```bash
docker build -t spotq-queue-service .
```

Run container

```bash
# Run container locally with environment file variables
docker run -d --name queue-service -p 3004:3004 --env-file .env spotq-queue-service
```

Application

```
http://localhost:3004
```

Metrics

```
http://localhost:3004/metrics
```

---

# Observability

## Logging

Structured logs are written to stdout.

Example

```json
{"level":"INFO","time":"2026-08-05T19:04:58.653Z","pid":72748,"hostname":"Ajexs-MacBook-Air.local","serviceName":"spotq-queue-service","requestId":"59913a69-8bac-45bd-a8b2-5d8e751ce9ea","correlationId":"0b33d0ea-8355-4789-a5f6-d7bb9850cb76","traceId":"0b33d0ea-8355-4789-a5f6-d7bb9850cb76","msg":"Incoming request","method":"GET","url":"/health","ip":"::ffff:127.0.0.1"}
```

---

## Metrics

Prometheus endpoint

```text
GET /metrics
```

Collected metrics

- HTTP Requests
- Request Duration
- Event Loop Metrics
- Process Metrics
- Dependency health status (`database_up` / `redis_up`)

---

# Project Architecture

This project follows **Clean Architecture**.

```text
Presentation
        │
        ▼
Application
        │
        ▼
Domain
        │
        ▼
Infrastructure
```

Responsibilities

Presentation

- HTTP Layer
- Middleware (logger tracing, metrics counting, error handlers)
- Routes

Application

- Business Use Cases

Domain

- Entities
- Business Rules

Infrastructure

- Database configuration & adapter clients
- Redis client
- Observability and metrics registries
- Config loading and schema validation

---

# Branching Strategy

Permanent branches

```
main
staging
development
```

Working branches (must follow ticket key matching convention)

```
feat/<feature>
fix/<issue>
refactor/<module>
docs/<topic>
chore/<task>
hotfix/<issue>
```

Branch Name Rule: All working branches must include a JIRA ticket key matching:
`^(feat|fix|chore|refactor|hotfix)/SCRUM-[0-9]+(-.+)?$`

---

# Coding Standards

Follow:

- Clean Architecture
- SOLID Principles
- TypeScript Strict Mode
- Biome Formatting and check validation
- Structured Logging with tracing IDs
- Prometheus Metrics (avoid high cardinality routes using `'unmatched_route'`)
- Conventional Git Commits

---

# CI Pipeline

GitHub Actions executes:

- Validate Branch Name naming rules
- Install Dependencies
- Generate Prisma Client
- Run Linter (Biome)
- Type Check (`tsc` compilation check)
- Execute Tests (with mock test env variables)
- Build Docker Image

Triggered on

- Pull Request (targeting development, staging, or main)
- Push to development, staging, or main

---

# Development Guidelines

Before creating a Pull Request

Run

```bash
pnpm lint
```

```bash
pnpm test
```

```bash
pnpm build
```

Verify

- Application Endpoint (`/health` returns `200 UP` when dependencies are healthy)
- Metrics Endpoint (`/metrics`)

Ensure Docker builds successfully.

---

# Future Enhancements

Upcoming implementations include

- Waitlist Position API
- Queue Status Lifecycle
- Customer Notification alerts
- Unit and Integration tests for business use cases
- Kubernetes Deployment charts
- OpenTelemetry Distributed Tracing

---

# License

This project is part of the **SpotQ Platform** and follows the internal engineering standards defined by the SpotQ Backend Architecture.
