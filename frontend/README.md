# KANSBE Frontend — Angular Application

> **Version:** 1.0 | **Framework:** Angular 16 | **Port:** 4200

KANSBE is a professional freelancing platform connecting skilled freelancers with clients. This repository contains the full Angular frontend serving the **Freelancer Portal**, **Client Portal**, and **Admin Dashboard**.

---

## 📚 Documentation

Full project documentation is located in the `/docs` folder at the project root:

| File | Description |
|---|---|
| [`01_Technical_Documentation.md`](../../docs/01_Technical_Documentation.md) | Tech stack, architecture, project structure, security, deployment |
| [`02_User_Documentation.md`](../../docs/02_User_Documentation.md) | End-user guide for Freelancers and Clients |
| [`03_Functional_Documentation.md`](../../docs/03_Functional_Documentation.md) | Business rules, feature modules, workflows, permissions |
| [`04_System_Documentation.md`](../../docs/04_System_Documentation.md) | Infrastructure, data flow, DB design, scalability |
| [`05_API_Documentation.md`](../../docs/05_API_Documentation.md) | All REST API endpoints with request/response formats |

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Angular | 16 | SPA Framework |
| Angular Material | Latest | UI Component Library |
| Bootstrap | 5 | CSS Grid & Utilities |
| Socket.IO Client | Latest | Real-time WebSocket |
| JWT Decode | Latest | Token parsing |
| FontAwesome | Latest | Icons |

---

## 🚀 Getting Started

### Prerequisites

```
Node.js   v16+
npm       v8+
Angular CLI: npm install -g @angular/cli
```

### Installation

```bash
cd frontend/kans_frontend/kans_applications
npm install
```

### Environment Configuration

Set your API base URL in `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5001'
};
```

### Run Development Server

```bash
ng serve
# Navigate to http://localhost:4200
```

The proxy (`proxy.conf.json`) automatically forwards `/api` requests to the backend on port `5001`.

### Build for Production

```bash
ng build --configuration production
# Output: dist/kans_applications/
```

---

## 📂 Application Structure

```
src/app/
├── new-home/               ← Public landing page
├── auth/                   ← Login / Signup (Freelancer & Client)
├── Freelancer-home/        ← Freelancer Portal
│   ├── dashboard/
│   ├── profile/
│   ├── settings/
│   ├── projects/
│   ├── project-portal/
│   ├── messages/
│   ├── notifications/
│   ├── learning-portal/
│   ├── blogs/
│   └── support/
├── Client-home/            ← Client Portal
│   ├── cdashboard/
│   ├── client-profile/
│   ├── csettings/
│   ├── client-projects/
│   ├── client-post-project/
│   ├── client-messages/
│   ├── client-notifications/
│   └── freelancers/
├── admin/                  ← Admin Dashboard
│   ├── admin-dashboard/
│   ├── admin-clients/
│   ├── admin-freelancers/
│   └── admin-projects/
├── guards/                 ← Route guards (roleGuard)
├── interceptors/           ← HTTP interceptors (JWT attachment)
├── services/               ← Angular services (API calls)
└── shared/                 ← Shared components
```

---

## 🔑 Key Application Routes

| Route | Component | Role |
|---|---|---|
| `/` | Landing Page | Public |
| `/fl-login`, `/fl-signup` | Freelancer Auth | Public |
| `/cl-login`, `/cl-signup` | Client Auth | Public |
| `/home/freelancer-dash` | Freelancer Dashboard | Freelancer |
| `/home/profile` | Freelancer Profile | Freelancer |
| `/home/projects` | Project Marketplace | Freelancer |
| `/home/project/:p_id` | Project Portal | Freelancer |
| `/home/messages` | Chat | Freelancer |
| `/home/learning` | Learning Portal | Freelancer |
| `/home/client-dash` | Client Dashboard | Client |
| `/home/post-project` | Post Project | Client |
| `/home/client-projects` | Manage Projects | Client |
| `/home/client-messages` | Client Chat | Client |
| `/home/support` | Support | All |
| `/alpha` | Admin Dashboard | Admin/Manager |

---

## ✨ Key Features

- **Smart Header:** Hide-on-scroll navbar with `--nav-offset` CSS variable
- **Real-time Chat:** Socket.IO powered messaging
- **Real-time Notifications:** WebSocket notification system
- **Project Marketplace:** Skill-based project browsing
- **Task Management:** Per-project task tracking
- **Meeting Scheduler:** Multi-party approval workflow
- **Learning Portal:** Curated resources for freelancers
- **File Uploads:** Resume, certifications, project briefs (AWS S3)
- **Profile Completion Gating:** Post Project button locked until profile complete
- **Dynamic Validation:** Real-time form validation with animated error messages
- **Role-based Access:** `roleGuard` protects Admin/Manager routes

---

## 🧪 Testing

```bash
ng test          # Unit tests via Karma + Jasmine
ng e2e           # End-to-end tests (if configured)
```

---

## 🔒 Security Notes

- JWT access tokens are stored **in-memory** (not localStorage)
- Refresh tokens are stored in **HTTP-only cookies**
- All API calls are proxied through the backend which enforces rate limiting
- Route guards (`roleGuard`) prevent unauthorized access to admin pages

---

## 🤝 Backend

The backend API runs at `http://localhost:5001`. See the [Backend README](../../backend/kans_backend/mycontacts-backend/README.md) and [`05_API_Documentation.md`](../../docs/05_API_Documentation.md) for full API reference.

---

*© 2026 KANSBE Platform*
