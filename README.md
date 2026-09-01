<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

<h1 align="center">🏦 Loan Data Verification Copilot</h1>

<p align="center">
  <strong>Turn messy loan records into a validated, traceable, auditable dataset — powered by AI.</strong>
</p>

<p align="center">
  <em>Built for the Intain FinTech Challenge</em>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Validation Rules Engine](#-validation-rules-engine)
- [Role-Based Access](#-role-based-access)
- [AI-Powered Features](#-ai-powered-features)
- [Screenshots](#-screenshots)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**Loan Data Verification Copilot** is a full-stack application designed to automate and streamline the verification of loan data records. In structured finance, loan tapes often contain errors — invalid dates, out-of-range interest rates, duplicate borrower records, and inconsistent payment statuses. This copilot ingests raw loan data files (CSV/Excel), runs them through a configurable rules engine, flags exceptions, and leverages **Google Gemini AI** to suggest corrections — all wrapped in a role-based workflow with a complete audit trail.

### The Problem

Financial institutions spend thousands of hours manually reviewing loan tape data for:
- Missing or malformed fields
- Date logic errors (maturity before origination)
- Balances exceeding original principal
- Duplicate loan IDs or suspicious borrower signatures
- Inconsistent payment status vs. days-past-due
- Cross-file conflicts between loan tapes and servicer updates

### The Solution

This copilot automates the entire pipeline:

```
📂 Upload  →  📥 Ingest  →  ✅ Validate  →  ⚠️ Flag Exceptions  →  🤖 AI Recommend  →  👁️ Review  →  🔒 Verify  →  📊 Audit
```

---

## ✨ Key Features

| Feature | Description |
|---|---|
| **📂 Bulk Data Ingestion** | Upload CSV/Excel loan tapes with automatic parsing, row-level error tracking, and import history |
| **✅ Configurable Rules Engine** | 10+ built-in validation rules across categories: required fields, date logic, numeric ranges, enum lookups, cross-record, cross-file, staleness, and consistency |
| **🤖 AI-Powered Corrections** | Google Gemini integration generates intelligent fix suggestions with explanations for each exception |
| **👥 Role-Based Workflows** | Three distinct roles — **Operator** (upload & import), **Reviewer** (triage & decide), **Consumer** (access verified data) |
| **🔒 Verified Records** | Golden-copy records with cryptographic hashes, reviewer attestation, and tamper-evident seals |
| **📊 Full Audit Trail** | Every action (upload, validate, review, approve, correct, verify) is logged with actor, timestamp, and metadata |
| **📈 Live Dashboards** | Role-specific dashboards with real-time stats, severity breakdowns, pass rates, and data quality scores |
| **🔐 JWT Authentication** | Secure login with bcrypt password hashing and JWT-based session management |
| **💡 Graceful Fallback** | Frontend works with built-in mock data when the backend is unavailable — perfect for demos |

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        Login["Login Page"]
        OD["Operator Dashboard"]
        RD["Reviewer Dashboard"]
        CD["Consumer Dashboard"]
        EQ["Exception Queue"]
        LD["Loan Detail"]
        VR["Verified Records"]
        AT["Audit Trail"]
    end

    subgraph Backend["Backend (NestJS)"]
        Auth["Auth Module"]
        Ingestion["Ingestion Module"]
        Validation["Validation Module"]
        Exceptions["Exceptions Module"]
        AI["AI Assistant Module"]
        VRM["Verified Records Module"]
        Audit["Audit Module"]
        Dashboard["Dashboard Module"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL"]
        Prisma["Prisma ORM"]
    end

    subgraph External["External Services"]
        Gemini["Google Gemini AI"]
    end

    Frontend -->|REST API| Backend
    Backend --> Prisma --> PG
    AI -->|Explain / Suggest / Generate Rules| Gemini
```

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **NestJS 10** | Modular, enterprise-grade Node.js framework |
| **Prisma 5** | Type-safe ORM with migrations and schema management |
| **PostgreSQL** | Production-grade relational database |
| **Passport + JWT** | Authentication and authorization |
| **Google Generative AI SDK** | Gemini-powered AI recommendations |
| **csv-parse** | High-performance CSV parsing for loan tape ingestion |
| **class-validator** | DTO validation with decorators |

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI library |
| **TypeScript 5** | End-to-end type safety |
| **Vite 5** | Lightning-fast dev server and build tool |
| **Tailwind CSS 3** | Utility-first styling with custom design tokens |
| **React Router 7** | Client-side routing with role-based guards |
| **Lucide React** | Beautiful, consistent icon library |
| **IBM Plex** | Typography — Sans, Mono, and Slab variants |

---

## 📁 Project Structure

```
project/
├── backend/                    # NestJS API server
│   ├── config/
│   │   └── validation_rules.json    # Declarative rule definitions
│   ├── fixtures/               # Seed data and test fixtures
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (10 models)
│   ├── scripts/
│   │   ├── seed.ts             # Database seeder
│   │   ├── reset-db.ts         # Database reset utility
│   │   └── smoke-test.ts       # API smoke test suite
│   └── src/
│       ├── ai-assistant/       # Gemini AI integration
│       ├── audit/              # Audit event logging & interceptor
│       ├── auth/               # JWT auth, guards, strategies
│       ├── common/             # Shared serializers & utilities
│       ├── dashboard/          # Aggregated stats endpoints
│       ├── exceptions/         # Exception CRUD & review actions
│       ├── ingestion/          # CSV/Excel file upload & parsing
│       ├── prisma/             # Prisma service module
│       ├── validated/          # Post-validation record mgmt
│       ├── validation/         # Rules engine & registry
│       ├── verified-records/   # Golden-copy record management
│       ├── app.module.ts       # Root module
│       └── main.ts            # Bootstrap entry point
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   │   ├── AppShell.tsx    # Layout wrapper with sidebar nav
│   │   │   ├── TopBar.tsx      # Header with role indicator
│   │   │   ├── VerifiedStamp.tsx  # Visual verification badge
│   │   │   └── ui.tsx          # Reusable UI primitives
│   │   ├── pages/
│   │   │   ├── Login.tsx       # Authentication page
│   │   │   ├── OperatorDashboard.tsx
│   │   │   ├── ImportHistory.tsx
│   │   │   ├── ReviewerDashboard.tsx
│   │   │   ├── ExceptionQueue.tsx
│   │   │   ├── LoanDetail.tsx  # Full loan review with AI
│   │   │   ├── ConsumerDashboard.tsx
│   │   │   ├── VerifiedRecords.tsx
│   │   │   ├── VerifiedRecordDetail.tsx
│   │   │   └── AuditTrail.tsx
│   │   ├── services/
│   │   │   └── api.ts          # API client with mock fallback
│   │   ├── utils/              # Helper functions
│   │   ├── appContext.tsx      # Global state (auth, role)
│   │   ├── types.ts            # Shared TypeScript interfaces
│   │   └── mockData.ts         # Built-in demo data
│   └── index.html              # Entry HTML
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **PostgreSQL** ≥ 14 (or a managed instance like Supabase/Neon)
- **Google Gemini API Key** *(optional — for AI features)*

### 1. Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database URL and API keys (see Environment Variables section)

# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Seed initial data (validation rules + sample records)
npm run prisma:seed

# Start development server
npm run start:dev
```

The backend will be available at **http://localhost:3000**

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
# Edit .env to point to your backend
# VITE_API_BASE=http://localhost:3000

# Start development server
npm run dev
```

The frontend will be available at **http://localhost:5173**

> **💡 Tip:** The frontend works without the backend! When `VITE_API_BASE` is unset or the backend is unreachable, it automatically falls back to built-in mock data — perfect for quick demos and UI development.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (e.g., `postgresql://user:pass@localhost:5432/loan_copilot`) |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key for AI features |
| `PORT` | ❌ | Server port (default: `3000`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | ❌ | Backend API URL (default: falls back to mock data) |

---

## 🗃 Database Schema

The application uses **10 Prisma models** to represent the complete loan verification lifecycle:

```mermaid
erDiagram
    User {
        string id PK
        string name
        string email UK
        enum role
        string passwordHash
    }

    SourceFile {
        string id PK
        string filename
        enum type
        string uploadedBy
        int rowCount
        enum status
    }

    LoanRecordRaw {
        string id PK
        string sourceFileId FK
        int rowNumber
        json rawPayload
    }

    LoanRecord {
        string id PK
        string loanId UK
        string borrowerId
        float originalPrincipal
        float currentBalance
        float interestRate
    }

    ValidationRule {
        string id PK
        string code UK
        string name
        string category
        json config
        boolean enabled
    }

    Exception {
        string id PK
        string loanId FK
        string ruleId FK
        enum severity
        enum status
        string detail
    }

    ReviewAction {
        string id PK
        string exceptionId FK
        string reviewerId
        string action
        json editedFields
    }

    AIRecommendation {
        string id PK
        string exceptionId FK
        string suggestedCorrection
        string explanation
        enum status
    }

    VerifiedRecord {
        string id PK
        string loanId UK
        json canonicalData
        string recordHash
        string verifiedBy
    }

    AuditEvent {
        string id PK
        string eventType
        string entityId
        string actor
        json metadata
    }

    SourceFile ||--o{ LoanRecordRaw : contains
    LoanRecord ||--o{ Exception : has
    ValidationRule ||--o{ Exception : triggers
    Exception ||--o{ ReviewAction : reviewed_by
    Exception ||--o{ AIRecommendation : suggested_by
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login and receive JWT token |
| `GET` | `/auth/me` | Get current user profile |

### Ingestion
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ingestion/upload` | Upload a CSV/Excel loan tape (multipart) |
| `GET` | `/ingestion/files` | List all uploaded source files |
| `GET` | `/ingestion/files/:id/rows` | Get raw rows for a source file |

### Validation
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/validation/run/:sourceFileId` | Run validation rules on a source file |
| `GET` | `/validation/rules` | List all validation rules |

### Exceptions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/exceptions` | List all exceptions (with filters) |
| `GET` | `/exceptions/:id` | Get exception detail |
| `POST` | `/exceptions/:id/review` | Submit a review action on an exception |

### AI Assistant
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/ai/explain/:exceptionId` | AI-generated explanation for an exception |
| `POST` | `/ai/suggest/:exceptionId` | AI-generated correction suggestion |
| `POST` | `/ai/generate-rule` | AI-generated validation rule from description |
| `PATCH` | `/ai/recommendations/:id` | Accept/reject an AI recommendation |

### Verified Records
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/verified-records` | List all verified (golden-copy) records |
| `GET` | `/verified-records/:loanId` | Get verified record detail with hash |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/dashboard/summary` | Aggregated system summary |
| `GET` | `/dashboard/operator` | Operator-specific dashboard data |
| `GET` | `/dashboard/reviewer` | Reviewer-specific dashboard data |
| `GET` | `/dashboard/consumer` | Consumer-specific dashboard data |

### Audit
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/audit/:entityId` | Get audit trail for an entity |

> **Note:** All endpoints (except auth) require a valid JWT token in the `Authorization: Bearer <token>` header.

---

## ⚙️ Validation Rules Engine

The rules engine is declarative and extensible. Rules are defined in [`config/validation_rules.json`](backend/config/validation_rules.json) and loaded into the database at seed time.

### Built-in Rules

| Code | Rule Name | Category | Severity | Description |
|---|---|---|---|---|
| `REQUIRED_FIELDS` | Required Fields Presence | required | 🔴 High | Ensures `loan_id`, `borrower_id`, `original_principal`, `interest_rate` are present |
| `DATE_FORMAT_LOGIC` | Date Order & Format Logic | date | 🔴 High | Validates maturity date comes after origination date |
| `NUMERIC_RANGE` | Numeric Range Constraints | numeric | 🔴 High | Interest rate between 1%–25%; balance ≤ principal |
| `ENUM_LOOKUP` | Enum Value Validation | enum | 🟡 Medium | Validates US state codes and payment status values |
| `DUPLICATE_LOAN_ID` | Duplicate Loan Identifier | cross-record | 🔴 High | Flags duplicate loan IDs within a batch |
| `DUPLICATE_BORROWER_SIGNATURE` | Suspicious Duplicate Borrower | cross-record | 🔴 High | Detects identical `borrower_id` + `principal` + `origination_date` combinations |
| `CROSS_FILE_CONFLICT` | Loan Tape vs Servicer Conflict | cross-file | 🔴 High | Compares balance, payment status, and DPD across files |
| `STALE_RECORD` | Record Staleness Check | staleness | 🟢 Low | Flags records older than 180 days |
| `STATUS_CONSISTENCY` | Payment Status vs DPD | consistency | 🔴 High | Ensures payment status aligns with days-past-due |
| `DOCUMENT_STATUS` | Document Completeness | required/lookup | 🟡 Medium | Validates document status is `Complete` or `Pending Review` |

### Adding Custom Rules

1. Add a new rule definition to `config/validation_rules.json`
2. Implement the validation logic in `backend/src/validation/registry.ts`
3. Re-seed the database: `npm run prisma:seed`

---

## 👥 Role-Based Access

The application implements three distinct user roles, each with their own dashboard and capabilities:

### 🔧 Operator
- Upload and import loan tape files (CSV/Excel)
- View import history and row-level errors
- Monitor validation pass/fail rates
- See corrections requested by reviewers
- Re-submit corrected files

### 🔍 Reviewer
- Browse exception queue with severity filters
- Drill into individual loan records
- Request AI-powered explanations and fix suggestions
- Approve, reject, or request corrections on exceptions
- Add comments to exception reviews
- Verify and seal records as golden copies

### 📊 Consumer
- Access verified (golden-copy) loan records
- View data quality scores
- Browse complete audit trails per loan
- Export verified datasets

---

## 🤖 AI-Powered Features

The copilot integrates with **Google Gemini** (`gemini-2.5-flash`) to provide:

### 1. Exception Explanations
> *"Why did this loan fail validation?"*

The AI analyzes the exception context (rule type, loan data, field values) and generates a human-readable explanation of what went wrong and why it matters.

### 2. Correction Suggestions
> *"How should this be fixed?"*

Given an exception, the AI suggests a specific correction (e.g., "Change interest_rate from 0.35 to 0.035 — likely a decimal placement error") with a confidence-scored explanation.

### 3. Rule Generation
> *"Create a validation rule that flags any loan where the borrower state doesn't match the servicer's coverage area."*

Describe a rule in natural language, and the AI generates the validation configuration, severity, and implementation.

### Fallback Mode

When no API key is configured or the Gemini service is unavailable, the system falls back to a **heuristic AI engine** that provides deterministic rule-based suggestions — ensuring the application always works.

---

## 🖼️ Screenshots

> The frontend features a premium dark-mode design with IBM Plex typography, glassmorphism effects, and role-specific dashboards.

| Page | Description |
|---|---|
| **Login** | Role-selection login with animated gradients |
| **Operator Dashboard** | Import stats, validation summary, correction queue |
| **Reviewer Dashboard** | Exception severity breakdown, AI summary, recent decisions |
| **Exception Queue** | Filterable/sortable list of all exceptions |
| **Loan Detail** | Full loan record with exceptions, AI suggestions, comments, and review actions |
| **Consumer Dashboard** | Verified records count, data quality score, verification timeline |
| **Verified Record Detail** | Golden-copy data with cryptographic hash and audit trail |
| **Audit Trail** | Complete chronological event log per loan |

---

## 🧪 Testing

### Backend

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e

# API smoke test (requires running server)
npm run smoke-test
```

### Frontend

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Production build (validates compilation)
npm run build
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Style

- Backend follows NestJS module conventions with service/controller/module pattern
- Frontend uses functional React components with TypeScript
- Both use Prettier for formatting (`npm run format`)

---

## 📄 License

This project is **UNLICENSED** — built for the Intain FinTech Challenge.

---

<p align="center">
  <strong>Built with ❤️ for the Intain FinTech Challenge</strong>
  <br />
  <em>Turning messy loan data into verified, auditable gold.</em>
</p>
