# KANSBE — View Resume (privacy-safe Client View)

This repository contains the complete feature:

| Folder | What it is |
|---|---|
| `frontend/` | Angular app — **View Resume** button + client-facing resume page |
| `backend/` | Node/Express API — 4 Client View endpoints (mirror of `KANS-Application/kans_backend`, branch `developer`) |
| root + `backend/mycontacts-backend/ai-agent/docgen/` | Python FastAPI docgen service |

> No `.env`, credentials, or `node_modules` are committed.

---

## Requirements

- **Node.js 18+** (the backend uses native `FormData` / `Blob`)
- **Python 3.10+**
- **MongoDB** (Atlas or local)
- **Redis** — optional. The backend logs connection errors without it; background queues/workers need it.
- **Angular CLI** — or use `npx ng`

---

## 1. Backend — port 5001

```bash
cd backend/mycontacts-backend
npm install
npm start          # node server.js
```

Create `backend/mycontacts-backend/.env` (not committed):

```env
PORT=5001
CONNECTION_STRING=mongodb+srv://<user>:<password>@<cluster>/<database>
MONGODB_DB_NAME=<database>

ACCESS_TOKEN_SECRET=<random string>
REFRESH_TOKEN_SECRET=<random string>
ADMIN_ACCESS_TOKEN_SECRET=<random string>
ADMIN_REFRESH_TOKEN_SECRET=<random string>

# Shared with the docgen service (must be identical)
PYTHON_API_KEY=<random string>
PYTHON_API_URL=http://127.0.0.1:8002

# Optional
GOOGLE_CLIENT_ID=
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=
SES_VERIFIED_EMAIL=
# REDIS_URL=redis://127.0.0.1:6379
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

CORS already allows `http://localhost:4200` and `https://kansbe.com`.

---

## 2. Docgen service — port 8002

```bash
cd backend/mycontacts-backend/ai-agent/docgen

python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
python service.py
```

The service loads `docgen/.env`, then `ai-agent/.env`. Put the **same** key used by the backend there:

```env
PYTHON_API_KEY=<same value as the backend .env>
```

If Presidio/spaCy complains about a missing model:

```bash
python -m spacy download en_core_web_lg
```

Service runs at `http://127.0.0.1:8002` (`POST /process`).

---

## 3. Frontend — port 4200

```bash
cd frontend
npm install
npm start          # ng serve
```

The API base is set in `frontend/src/app/services/service.service.ts`:

```ts
localhost = "http://localhost:5001/api";
```

---

## 4. Test the flow

1. Start **backend** (`:5001`), **docgen** (`:8002`), **frontend** (`:4200`).
2. Log in as a **client**.
3. Open a project → freelancer card → **View Resume** (under *Key Skills*).
4. The page shows only the whitelisted sections; empty sections are hidden.

### Endpoints

| Method | Path | Who |
|---|---|---|
| `POST` | `/api/users/generateClientView/:fl_id` | Freelancer (own profile) — uploads PDF/DOCX |
| `GET` | `/api/users/clientview/:fl_id` | Freelancer (owner) / admin |
| `GET` | `/api/users/clientview/public/:fl_id` | Admin or an associated client |
| `GET` | `/api/users/clientview/project/:p_id/freelancer/:fl_id` | Client who owns the project (used by the button) |

All require `Authorization: Bearer <token>`.

---

## Privacy guarantees

- Server stores and returns **only** these 9 keys:
  `skills`, `experience`, `roles`, `responsibilities`, `projects`, `technologies`, `certifications`, `achievements`, `portfolio`
- The original file, filename, raw text, and PII values are never stored or returned.
- `piiDetected` contains booleans only.
- The Angular page renders escaped text — no `innerHTML`.
