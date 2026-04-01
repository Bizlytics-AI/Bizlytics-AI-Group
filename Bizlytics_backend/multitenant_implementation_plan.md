# Multi-Tenant Architecture Overview & Implementation Guide

This document provides a technical overview of the multi-tenant architecture implemented for the Bizlytics Backend. It serves as a guide for system handovers, specifically for the upcoming domain and subdomain integration phase.

## 1. Architecture Overview

The system uses a **Single Database, Multiple Schemas** approach for tenant data isolation. This strategy ensures strict data separation while maintaining a shared codebase and infrastructure.

### Core Components
- **NGINX Gateway**: Acts as the entry point, handling SSL/TLS and forwarding tenant identity.
- **FastAPI Backend**: Implements tenant-aware logic via middleware and dependencies.
- **PostgreSQL Database**: Uses the `public` schema for shared metadata and unique schemas for each company (tenant).

---

## 2. Request Lifecycle & Tenant Identification

A standardized identification flow ensures that every request is processed within the correct tenant context.

### Identification Mechanism
- **Identification Header**: `X-Tenant-ID` (e.g., `company_abc_company`).
- **Middleware Interception**: The `tenant_middleware` extracts this header and initializes the database session.
- **Schema Switching**: The middleware executes `SET search_path TO {tenant_schema}, public` on the database connection. This ensures all subsequent queries default to the tenant's private tables while maintaining access to shared tables in the `public` schema.

### Session Management
- **Single-Session Policy**: To prevent connection leakage and maintain the `search_path` state, a single database session is created per request and attached to `request.state.db`.
- **Dependency Integration**: The `get_db` dependency yields the session directly from the request state, ensuring consistency across authentication layers and route handlers.
- **Attribute Stability**: `expire_on_commit` is set to `False` in the session maker to prevent redundant and potentially failing re-fetches after database commits.

---

## 3. Database Schema Strategy

Data is partitioned based on the sensitivity and scope of the information.

### Public Schema (Global Metadata)
Contains tables shared across the entire application:
- `users`: Universal login identities (email, password_hash, role, and assigned `schema_name`).
- `companies`: Master list of registered companies and their approval statuses.
- `refresh_tokens`: Global session management.

### Tenant Schema (Isolated Business Data)
Contains tables unique to a specific company:
- `hr_accounts`: Storage for the metadata and approval status of HR users assigned to the company.
- `raw_uploads`: Storage for company-specific documents (CSV, XLSX, JSON) uploaded by HR users.
- **Business Logic Tables**: All future company-specific modules (analytics, reporting, etc.) will be created here.

---

## 4. Authentication & Authorization Flow

The security model ensures that users only access the schema assigned to them during registration.

1.  **Login**: The user provides credentials which are verified against `public.users`.
2.  **Status Check**: For HR roles, the system identifies the assigned `schema_name` from the user record, performs a temporary schema switch, and verifies the approval status in the tenant's `hr_accounts` table.
3.  **JWT Issue**: A successful login returns a token containing the user's `schema_name`.
3.  **Authorization**: The `require_hr` and `require_company` dependencies verify that the authenticated user has permission to operate within the tenant schema requested in the `X-Tenant-ID` header.

---

## 5. Implementation Status: Verified & Functional

The following flows have been implemented and verified as stable:
- **Tenant Registration**: Automatic schema creation and table initialization upon company registration.
- **Secure File Upload**: Documents are saved strictly within the company's schema.
- **Isolated Retrieval**: HR dashboards correctly list only the files belonging to their specific tenant.

---

## 6. Next Steps: Production Subdomain Integration

The current setup uses the `X-Tenant-ID` header for local development simulation. The next phase involves transitioning to actual subdomains.

### Required Actions:
1.  **Wildcard DNS Configuration**: Configure `*.bizlytics.com` (or the chosen domain) to point to the server IP.
2.  **NGINX Subdomain Extraction**: Update the NGINX configuration to dynamically parse the subdomain from the request host.
    - **Draft Configuration**:
      ```nginx
      server {
          listen 80;
          server_name ~^(?<tenant>.+)\.bizlytics\.com$;
          location / {
              proxy_set_header X-Tenant-ID company_$tenant;
              proxy_pass http://127.0.0.1:8000;
          }
      }
      ```
3.  **Cross-Origin Resource Sharing (CORS)**: Update the backend CORS policy to support wildcard subdomains or dynamically validate the origin against the registered companies.

---

## 7. Operational Notes

- **Manual Schema Initialization**: The `init_tenant_tables.py` script is available to backfill any missing tables in existing tenant schemas during architectural updates.
- **Database Inspection**: Tenant-specific tables can be viewed using:
  `SET search_path TO company_name; SELECT * FROM raw_uploads;`
