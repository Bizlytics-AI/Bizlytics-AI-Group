# Bizlytics Backend — Authentication Module Documentation

> **Last Updated:** March 10, 2026  
> **Status:** ✅ Complete — All authentication flows are functional.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Models](#database-models)
3. [API Endpoints](#api-endpoints)
4. [Authentication Flows](#authentication-flows)
5. [Admin Seeding & Configuration](#admin-seeding--configuration)
6. [JWT Token System](#jwt-token-system)
7. [Security](#security)
8. [Multi-Tenancy](#multi-tenancy)
9. [Configuration Reference](#configuration-reference)
10. [File Reference](#file-reference)

---

## Architecture Overview

Bizlytics uses a **three-tier approval-based authentication** system:

```
Admin (Super User)
  └── Approves/Rejects → Company Registrations
        └── Approves/Rejects → HR Registrations
```

- **Admin** — Pre-seeded super user who manages the platform.
- **Company** — Registers and waits for Admin approval. Once approved, the Company can manage HR accounts.
- **HR** — Registers under a specific approved Company. Waits for Company approval before login.

> **Note:** OTP/SMTP-based verification has been removed. All verification is now done through the approval chain above.

---

## Database Models

All tables live in the `public` PostgreSQL schema.

### `companies`

| Column          | Type                  | Notes                         |
|-----------------|-----------------------|-------------------------------|
| `id`            | Integer (PK)          | Auto-generated                |
| `company_name`  | String                | Required                      |
| `company_email` | String (Unique, Idx)  | Also used as the company user email |
| `schema_name`   | String (Unique)       | Tenant schema for data isolation |
| `status`        | Enum: `pending`, `approved`, `rejected` | Default: `pending` |
| `created_at`    | DateTime              | Auto-set on creation          |

### `users`

| Column          | Type                  | Notes                         |
|-----------------|-----------------------|-------------------------------|
| `id`            | Integer (PK)          | Auto-generated                |
| `email`         | String (Unique, Idx)  | Login credential              |
| `password_hash` | String                | bcrypt hashed password        |
| `role`          | Enum: `admin`, `company`, `hr` | Determines access level |
| `schema_name`   | String (Nullable)     | Links to tenant schema        |
| `created_at`    | DateTime              | Auto-set on creation          |

### `hr_accounts`

| Column          | Type                  | Notes                         |
|-----------------|-----------------------|-------------------------------|
| `id`            | Integer (PK)          | Auto-generated                |
| `company_id`    | Integer (FK → `companies.id`) | CASCADE on delete     |
| `email`         | String (Unique, Idx)  | Must match a record in `users` |
| `password_hash` | String                | bcrypt hashed password        |
| `status`        | Enum: `pending`, `approved`, `rejected` | Default: `pending` |
| `created_at`    | DateTime              | Auto-set on creation          |

### `refresh_tokens`

| Column          | Type                  | Notes                         |
|-----------------|-----------------------|-------------------------------|
| `id`            | Integer (PK)          | Auto-generated                |
| `user_id`       | Integer (FK → `users.id`) | CASCADE on delete          |
| `token_hash`    | String (Unique, Idx)  | SHA-256 hash of the JWT token |
| `expires_at`    | DateTime              | Token expiry timestamp        |
| `revoked`       | Boolean               | Default: `False`              |
| `created_at`    | DateTime              | Auto-set on creation          |

### Enums

- **`CompanyStatus`**: `pending` | `approved` | `rejected`
- **`HRStatus`**: `pending` | `approved` | `rejected`
- **`UserRole`**: `admin` | `company` | `hr`

---

## API Endpoints

### Authentication Routes (`/auth`)

| Method | Endpoint                           | Auth Required | Description                              |
|--------|------------------------------------|:------------:|------------------------------------------|
| POST   | `/auth/company/register`           | No           | Register a new company (status: pending) |
| POST   | `/auth/hr/register`                | No           | Register a new HR (status: pending)      |
| POST   | `/auth/login`                      | No           | Login and get JWT tokens                 |
| POST   | `/auth/refresh`                    | No           | Refresh expired access token             |
| POST   | `/auth/logout`                     | Yes (JWT)    | Revoke all refresh tokens                |
| GET    | `/auth/me`                         | Yes (JWT)    | Get current user profile                 |
| GET    | `/auth/company/hr/pending`         | Yes (Company)| List pending HR registrations            |
| POST   | `/auth/company/hr/{hr_id}/approve` | Yes (Company)| Approve a pending HR                     |
| POST   | `/auth/company/hr/{hr_id}/reject`  | Yes (Company)| Reject a pending HR                      |

### Admin Routes (`/admin`)

| Method | Endpoint                                | Auth Required | Description                    |
|--------|-----------------------------------------|:------------:|--------------------------------|
| GET    | `/admin/companies/pending`              | Yes (Admin)  | List pending company registrations |
| POST   | `/admin/companies/{company_id}/approve` | Yes (Admin)  | Approve a company              |
| POST   | `/admin/companies/{company_id}/reject`  | Yes (Admin)  | Reject a company               |

---

## Authentication Flows

### 1. Admin Login

The Admin user is **pre-seeded** into the database (see [Admin Seeding](#admin-seeding--configuration)).

```
Admin opens /login → Enters credentials → Gets JWT tokens → Redirected to /admin/dashboard
```

### 2. Company Registration & Approval

```
Step 1: Company submits registration form
        → POST /auth/company/register
        → Creates Company record (status=pending) + User record (role=company)
        → Creates tenant schema in PostgreSQL

Step 2: Admin reviews pending companies
        → GET /admin/companies/pending
        → POST /admin/companies/{id}/approve  (or /reject)

Step 3: Company can now login
        → POST /auth/login (checks CompanyStatus == approved)
        → Gets JWT tokens → Redirected to /company/dashboard
```

### 3. HR Registration & Approval

```
Step 1: HR submits registration form (provides company admin email)
        → POST /auth/hr/register
        → Validates: company exists AND company status == approved
        → Creates User record (role=hr) + HRAccount record (status=pending)

Step 2: Company reviews pending HR registrations
        → GET /auth/company/hr/pending
        → POST /auth/company/hr/{hr_id}/approve  (or /reject)

Step 3: HR can now login
        → POST /auth/login (checks HRStatus == approved)
        → Gets JWT tokens → Redirected to /hr/dashboard
```

### 4. Login Enforcement Rules

The `login_user` function enforces the following rules before issuing tokens:

| User Role | Check                          | Error if Blocked                                        |
|-----------|--------------------------------|---------------------------------------------------------|
| Company   | `company.status == pending`    | "Your company registration is pending admin approval."  |
| Company   | `company.status == rejected`   | "Your company registration was rejected."               |
| HR        | `hr_account.status == pending` | "Your HR registration is pending company approval."     |
| HR        | `hr_account.status == rejected`| "Your HR registration was rejected by the company."     |

---

## Admin Seeding & Configuration

### Seed Script: `seed_admin.py`

This script creates the initial Admin user. **Run this once before using the platform.**

```bash
# From the backend root directory (with venv activated):
python seed_admin.py
```

**Default credentials** (override with environment variables):

| Setting          | Env Variable      | Default Value          |
|------------------|-------------------|------------------------|
| Admin Email      | `ADMIN_EMAIL`     | `admin@bizlytics.com`  |
| Admin Password   | `ADMIN_PASSWORD`  | `admin123`             |

**How it works:**
1. Checks if an admin user already exists — skips if yes.
2. Hashes the password using `bcrypt`.
3. Creates a `User` record with `role=admin` and `schema_name=public`.
4. Commits to the database.

> **Important:** Change the default password in production by setting the `ADMIN_PASSWORD` environment variable before running the script.

---

## JWT Token System

### Token Types

| Token Type     | Lifetime | Purpose                              |
|----------------|----------|--------------------------------------|
| Access Token   | 30 min   | Authenticate API requests (Bearer)   |
| Refresh Token  | 7 days   | Obtain new access token silently     |

### Token Payload

```json
{
  "user_id": 1,
  "role": "company",
  "schema_name": "company_acme_corp",
  "exp": "2026-03-10T12:00:00Z",
  "token_type": "access",
  "jti": "unique-uuid-hex"
}
```

### Token Refresh Flow

1. Access token expires → API returns `401`.
2. Client sends `POST /auth/refresh` with the refresh token.
3. Backend validates refresh token: correct type, exists in DB, not revoked.
4. Old refresh token is revoked (single-use rotation).
5. New access + refresh token pair is issued.

### Security Measures

- Refresh tokens are stored as **SHA-256 hashes** in the database.
- If a revoked token is reused, **all sessions for that user are terminated** (replay attack protection).
- Logout revokes all refresh tokens for the user.

---

## Security

### Password Hashing

- **Library:** `bcrypt` (direct, no passlib dependency)
- **File:** `app/core/security.py`
- Functions: `hash_password()`, `verify_password()`

### JWT Configuration

- **Library:** `python-jose` with HS256 algorithm
- **File:** `app/core/jwt_handler.py`
- Secret key configured via `JWT_SECRET_KEY` env variable

### Protected Routes

Authentication is enforced via FastAPI dependency injection:

| Dependency           | File                    | Purpose                                |
|----------------------|-------------------------|----------------------------------------|
| `get_current_user`   | `dependencies.py`       | Extract User from JWT Bearer token     |
| `require_role()`     | `dependencies.py`       | Factory for role-based access control  |
| `require_admin`      | `dependencies.py`       | Shortcut for `require_role("admin")`   |
| `require_company`    | `routes.py`             | Inline dependency for company role     |

---

## Multi-Tenancy

Each company gets an isolated PostgreSQL schema for future data isolation.

- **Schema naming:** `company_` + sanitized company name (e.g., `company_acme_corp`)
- **Created by:** `app/core/tenant.py` → `create_tenant_schema()`
- **SQL:** `CREATE SCHEMA IF NOT EXISTS "company_acme_corp"`
- The `schema_name` is stored on both the `Company` and `User` records, and included in JWT tokens for routing.

---

## Configuration Reference

### Environment Variables (`.env`)

| Variable                    | Default                  | Description                        |
|-----------------------------|--------------------------|------------------------------------|
| `DATABASE_URL`              | `postgresql://postgres:root@localhost:5432/bizlytics` | PostgreSQL connection string |
| `JWT_SECRET_KEY`            | `change-me-in-production`| Secret for signing JWTs            |
| `JWT_ALGORITHM`             | `HS256`                  | JWT signing algorithm              |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                   | Access token lifetime (minutes)    |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7`                     | Refresh token lifetime (days)      |
| `ADMIN_EMAIL`               | `admin@bizlytics.com`   | Seed admin email                   |
| `ADMIN_PASSWORD`            | `admin123`              | Seed admin password                |
| `SMTP_*`                    | (various)               | Legacy — not used in current flow  |

### CORS Origins

Allowed origins (configured in `app/main.py`):
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:3000`

---

## File Reference

| File                           | Purpose                                          |
|--------------------------------|--------------------------------------------------|
| `app/main.py`                  | FastAPI app initialization, CORS, routers        |
| `app/database.py`              | SQLAlchemy engine, session factory, `get_db()`   |
| `app/auth/models.py`           | SQLAlchemy models (Company, User, HRAccount, RefreshToken) |
| `app/auth/schemas.py`          | Pydantic request/response schemas                |
| `app/auth/repository.py`       | Database CRUD operations                         |
| `app/auth/service.py`          | Business logic (register, login, approve/reject HR) |
| `app/auth/routes.py`           | Auth API endpoints + Company HR management       |
| `app/auth/admin_routes.py`     | Admin-only API endpoints                         |
| `app/auth/admin_service.py`    | Admin business logic (approve/reject companies)  |
| `app/auth/dependencies.py`     | JWT auth + role-based access dependencies        |
| `app/core/security.py`         | bcrypt password hashing                          |
| `app/core/jwt_handler.py`      | JWT creation and decoding                        |
| `app/core/config.py`           | Environment variable configuration               |
| `app/core/tenant.py`           | Multi-tenant schema creation                     |
| `seed_admin.py`                | Admin user seeding script                        |
