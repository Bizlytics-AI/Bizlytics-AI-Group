# Bizlytics Frontend — Authentication Documentation

> **Last Updated:** March 10, 2026  
> **Status:** ✅ Complete — All frontend authentication flows are functional.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [API Layer](#api-layer)
5. [Authentication Context & State](#authentication-context--state)
6. [Pages & Components](#pages--components)
7. [Routing & Access Control](#routing--access-control)
8. [User Flows](#user-flows)
9. [Backend Connection](#backend-connection)

---

## Architecture Overview

The frontend authentication system follows a standard React pattern:

```
App.jsx
  └── AuthProvider (context)
        └── AppRoutes
              ├── AuthRoute (public: login, register)
              └── ProtectedRoute (private: dashboards)
```

- **State Management:** React Context API (`AuthContext`)
- **API Communication:** Axios with interceptors for JWT handling
- **Token Storage:** `localStorage` for access and refresh tokens
- **Routing:** React Router v7 with role-based guards

---

## Tech Stack

| Library            | Version  | Purpose                      |
|--------------------|----------|------------------------------|
| React              | 19.2.0   | UI framework                 |
| React Router DOM   | 7.13.1   | Client-side routing          |
| Axios              | 1.13.6   | HTTP client                  |
| React Hot Toast    | 2.6.0    | Toast notifications          |
| Lucide React       | 0.577.0  | Icon library                 |
| TailwindCSS        | 3.4.4    | Utility-first CSS            |
| Vite               | 7.3.1    | Build tool / dev server      |

---

## Project Structure

```
src/
├── utils/
│   └── api.js                    # Axios instance + interceptors
├── services/
│   └── authService.js            # API methods for all auth endpoints
├── context/
│   └── AuthContext.jsx           # Auth state provider
├── hooks/
│   └── useAuth.js                # Custom hook for auth context
├── layouts/
│   └── AuthLayout.jsx            # Split-screen auth page layout
├── components/
│   ├── auth/
│   │   ├── LoginForm.jsx         # Login form component
│   │   ├── RegisterCompanyForm.jsx   # Company registration form
│   │   └── RegisterHRForm.jsx    # HR registration form
│   └── common/
│       ├── Button.jsx            # Reusable button with loading state
│       ├── Input.jsx             # Reusable input with icon support
│       └── Loader.jsx            # Full-screen loading spinner
├── pages/
│   ├── auth/
│   │   ├── Login.jsx             # Login page
│   │   ├── CompanyRegister.jsx   # Company registration page
│   │   └── HRRegister.jsx       # HR registration page
│   └── Dashboard.jsx            # Role-based dashboard (admin/company/hr)
├── routes/
│   └── AppRoutes.jsx             # Route definitions + guards
└── App.jsx                       # Root component
```

---

## API Layer

### Axios Instance (`src/utils/api.js`)

- **Base URL:** `http://localhost:8000`
- **Default Headers:** `Content-Type: application/json`

#### Request Interceptor
Automatically attaches JWT access token from `localStorage`:
```
Authorization: Bearer <access_token>
```

#### Response Interceptor (Token Refresh)
1. Detects `401 Unauthorized` responses.
2. Attempts silent token refresh via `POST /auth/refresh`.
3. On success: stores new tokens, retries original request.
4. On failure: clears tokens, redirects to `/login`.
5. Uses `_retry` flag to prevent infinite refresh loops.

---

### Auth Service (`src/services/authService.js`)

All API calls are centralized here:

| Method                    | Backend Endpoint                            | Purpose                          |
|---------------------------|---------------------------------------------|----------------------------------|
| `registerCompany(data)`   | `POST /auth/company/register`               | Register a new company           |
| `registerHR(data)`        | `POST /auth/hr/register`                    | Register a new HR account        |
| `login(credentials)`      | `POST /auth/login`                          | Login, stores tokens             |
| `logout()`                | `POST /auth/logout`                         | Revokes tokens, clears storage   |
| `getMe()`                 | `GET /auth/me`                              | Get current user profile         |
| `getPendingCompanies()`   | `GET /admin/companies/pending`              | Admin: list pending companies    |
| `approveCompany(id)`      | `POST /admin/companies/{id}/approve`        | Admin: approve a company         |
| `rejectCompany(id)`       | `POST /admin/companies/{id}/reject`         | Admin: reject a company          |
| `getPendingHRs()`         | `GET /auth/company/hr/pending`              | Company: list pending HRs        |
| `approveHR(id)`           | `POST /auth/company/hr/{id}/approve`        | Company: approve an HR           |
| `rejectHR(id)`            | `POST /auth/company/hr/{id}/reject`         | Company: reject an HR            |

---

## Authentication Context & State

### AuthContext (`src/context/AuthContext.jsx`)

Provides global authentication state to the entire app:

| State / Method    | Type       | Description                                     |
|-------------------|------------|-------------------------------------------------|
| `user`            | Object     | Current user data (`id`, `email`, `role`, `schema_name`) |
| `isAuthenticated` | Boolean    | Whether a valid user session exists              |
| `loading`         | Boolean    | True during initial auth check on app load       |
| `login()`         | Function   | Authenticate user, fetch profile, update state   |
| `logout()`        | Function   | Revoke tokens, clear state and storage           |

**Initialization flow (on app load):**
1. Check `localStorage` for `access_token`.
2. If found, call `GET /auth/me` to validate and fetch user.
3. If valid → set `user` and `isAuthenticated = true`.
4. If invalid → clear tokens, stay unauthenticated.

### useAuth Hook (`src/hooks/useAuth.js`)

Convenience hook to consume `AuthContext`:
```jsx
const { user, isAuthenticated, loading, login, logout } = useAuth();
```

---

## Pages & Components

### Login Page (`/login`)

- **Component:** `LoginForm.jsx`
- **Fields:** Email, Password
- **On Success:** Role-based redirect:
  - `admin` → `/admin/dashboard`
  - `company` → `/company/dashboard`
  - `hr` → `/hr/dashboard`
- **Error Handling:** Displays backend error messages as toast notifications. Special handling for "pending approval" and "rejected" statuses.

### Company Registration (`/register/company`)

- **Component:** `RegisterCompanyForm.jsx`
- **Fields:** Company Name, Company Email, Password, Confirm Password
- **Payload sent:** `{ company_name, company_email, password }`
- **On Success:** Shows "pending admin approval" toast → redirects to `/login`.

### HR Registration (`/register/hr`)

- **Component:** `RegisterHRForm.jsx`
- **Fields:** HR Email, Company (Admin) Email, Password, Confirm Password
- **Payload sent:** `{ email, company_email, password }`
- **Validation:** Emails are lowercased and trimmed before sending.
- **Double-submit protection:** Uses `useRef` lock (`isSubmitting`) + `loading` state.
- **On Success:** Shows "pending company approval" toast → redirects to `/login`.

### Dashboard (`/admin/dashboard`, `/company/dashboard`, `/hr/dashboard`)

- **Component:** `Dashboard.jsx` (shared, role-adaptive)
- **Navbar:** Shows app name, user role badge, user email, logout button.
- **Admin View:** Lists pending company registrations with Approve/Reject buttons.
- **Company View:** Lists pending HR registrations with Approve/Reject buttons.
- **HR View:** Placeholder text with tenant schema info.

### Common Components

| Component     | File           | Features                                          |
|---------------|----------------|---------------------------------------------------|
| `Button`      | `Button.jsx`   | Loading spinner, disabled state, 3 variants       |
| `Input`       | `Input.jsx`    | Icon support, label, all HTML input props          |
| `Loader`      | `Loader.jsx`   | Animated spinner, optional full-screen mode        |

### Auth Layout (`AuthLayout.jsx`)

Split-screen layout used by all auth pages:
- **Left panel (desktop):** Gradient background with animated blobs, branding, tagline.
- **Right panel:** Form container with responsive sizing.
- **Mobile:** Left panel hidden, mobile logo shown above form.

---

## Routing & Access Control

### Route Definitions (`AppRoutes.jsx`)

| Path                  | Component        | Access          |
|-----------------------|------------------|-----------------|
| `/login`              | Login            | Public (AuthRoute) |
| `/register/company`   | CompanyRegister  | Public (AuthRoute) |
| `/register/hr`        | HRRegister       | Public (AuthRoute) |
| `/admin/dashboard`    | Dashboard        | Admin only      |
| `/company/dashboard`  | Dashboard        | Company only    |
| `/hr/dashboard`       | Dashboard        | HR only         |
| `/dashboard`          | Dashboard        | Any authenticated |
| `*`                   | → `/login`       | Fallback redirect |

### Route Guards

**`AuthRoute`** (public pages):
- If already authenticated → redirect to role-specific dashboard.
- Prevents logged-in users from seeing login/register pages.

**`ProtectedRoute`** (private pages):
- If not authenticated → redirect to `/login`.
- If authenticated but wrong role → redirect to `/dashboard`.
- `allowedRoles` prop controls which roles can access each route.

---

## User Flows

### Complete Registration-to-Login Flow

```
1. Company registers    →  POST /auth/company/register  →  status: pending
2. Admin logs in        →  POST /auth/login              →  /admin/dashboard
3. Admin approves       →  POST /admin/companies/{id}/approve
4. Company logs in      →  POST /auth/login              →  /company/dashboard
5. HR registers         →  POST /auth/hr/register        →  status: pending
6. Company approves HR  →  POST /auth/company/hr/{id}/approve
7. HR logs in           →  POST /auth/login              →  /hr/dashboard
```

### Token Lifecycle

```
Login → access_token (30 min) + refresh_token (7 days) saved to localStorage
  ↓
API Call → Authorization: Bearer <access_token>
  ↓
401 Unauthorized → Interceptor auto-refreshes → retries request
  ↓
Refresh fails → clear tokens → redirect /login
  ↓
Logout → POST /auth/logout → revoke all tokens → clear localStorage
```

---

## Backend Connection

| Setting         | Value                       |
|-----------------|-----------------------------|
| API Base URL    | `http://localhost:8000`     |
| Frontend URL    | `http://localhost:5173`     |
| CORS            | Enabled for ports 5173, 5174, 3000 |
| Auth Header     | `Authorization: Bearer <JWT>` |
| Token Storage   | `localStorage` keys: `access_token`, `refresh_token` |
