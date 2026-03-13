# Bizlytics System Architecture & Workflows

This document provides a comprehensive guide to the **Authentication** and **File Upload** workflows implemented in the Bizlytics backend (FastAPI). Use this to understand how the system is structured, what each file does, and how the logic flows between them.

---

## 1. Authentication Strategy: 3-Tier Approval

We use a **Manual Approval** system instead of OTPs to ensure high-quality onboarding.

### The Chain of Command:
1. **Admin (Superuser):** Manages the platform. Approves or Rejects **Company** registrations.
2. **Company:** Once approved by Admin, the Company Admin manages their own **HR employees**.
3. **HR Employee:** Registers under a Company email. Must be approved by the **Company Admin** before they can log in.

---

## 2. File-by-File Breakdown (Backend)

The backend is located in the `Bizlytics_backend/` directory.

### Core Structure (`app/`)
| File | Role | Key Functions |
| :--- | :--- | :--- |
| **`main.py`** | **The Entry Point** | Initializes the FastAPI app, manages CORS, and includes all routers (`auth`, `admin`, `analytics`). |
| **`database.py`** | **DB Connection** | Sets up SQLAlchemy engine and the `get_db` dependency to provide database sessions to routes. |

### Authentication Module (`app/auth/`)
| File | Role | Description |
| :--- | :--- | :--- |
| **`routes.py`** | **Public API Endpoints** | Defines endpoints like `/login`, `/register/company`, and `/register/hr`. Also contains HR approval routes for Companies. |
| **`service.py`** | **Business Logic** | The "brain" of auth. Handles password verification, status checks (is the user approved?), and token generation. |
| **`repository.py`** | **Database Queries** | Contains raw SQLAlchemy queries to fetch/save Users, Companies, and HR accounts from PostgreSQL. |
| **`models.py`** | **SQLAlchemy Models** | Defines the structure of the database tables (`User`, `Company`, `HRAccount`, `RefreshToken`). |
| **`schemas.py`** | **Data Validation** | Defines Pydantic models (DTOs) to validate incoming JSON data from the frontend and format outgoing responses. |
| **`dependencies.py`** | **Security Guards** | Functions that secure routes. E.g., `get_current_user` extracts the JWT; `require_role("admin")` ensures only admins can enter. |

### Analytics Module (`app/analytics/`)
| File | Role | Description |
| :--- | :--- | :--- |
| **`routes.py`** | **Analytics Endpoints** | Defines `/upload` and `/files`. Restricts upload access exclusively to the **HR** role. |
| **`service.py`** | **File Logic** | Handles file type detection (CSV vs JSON) and saves binary file content/metadata to the DB. |
| **`models.py`** | **Analytics Tables** | Defines the `RawUpload` table where all uploaded data metadata and binary content are stored. |

### Security & Multi-Tenancy (`app/core/`)
| File | Role | Description |
| :--- | :--- | :--- |
| **`security.py`** | **Hashing** | Uses `bcrypt` to securely salt and hash passwords so plain-text passwords are never stored. |
| **`jwt_handler.py`**| **Tokens** | Creates and decodes JWT tokens (Access & Refresh) used for session management. |
| **`tenant.py`** | **Multi-Tenancy** | Logic to create a dedicated PostgreSQL **Schema** for every new Company to isolate their data. |

---

## 3. Key Function Logic

### `service.py`: `login_user()`
1. Checks if the email exists in the `users` table.
2. Verifies the password using `bcrypt`.
3. **Conditional Check:**
   - If user is a **Company**, checks if `company.status == 'approved'`.
   - If user is an **HR**, checks if `hr_account.status == 'approved'`.
4. If all pass, returns an `AccessToken` and `RefreshToken`.

### `analytics/routes.py`: `upload_file()`
1. Uses a dependency `require_role("hr")` to block non-HR users.
2. Accepts a `UploadFile` (Multipart form).
3. Calls `analytics_service.process_upload` to save metadata (filename, size) and the file content to the database.

---

## 4. Frontend-Backend Interaction

1. **Frontend Request:** A user submits a form (e.g., Login).
2. **Axios Client (`api.js`):** Sends the request to the backend. If it's a protected route, it automatically attaches the JWT Bearer token.
3. **FastAPI Router:** Receives the request, validates the JWT, and checks roles.
4. **Service Layer:** Executes logic (e.g., checking approval status).
5. **Database:** Updates or retrieves data.
6. **Response:** Backend sends JSON back to React, which updates the UI (e.g., redirecting to Dashboard).

---

## 5. Security Summary
- **JWT Authentication:** Stateful session management using tokens stored in the browser.
- **Role-Based Access (RBAC):** Every route is protected by a whitelist of roles.
- **Bcrypt:** Industry-standard password protection.
- **Schema Isolation:** Multi-tenancy ensured via PostgreSQL schemas.
