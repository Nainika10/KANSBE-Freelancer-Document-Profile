# KANSBE Backend — Node.js REST API

> **Version:** 1.0 | **Runtime:** Node.js 16+ | **Port:** 5001
> **Swagger UI:** `http://localhost:5001/api-docs`

KANSBE backend is a RESTful API server built with Express.js and MongoDB. It powers the Freelancer Portal, Client Portal, and Admin Dashboard, and includes real-time WebSocket support for chat and notifications.

---

## 📚 Documentation

Full project documentation is located in the `/docs` folder at the project root:

| File | Description |
|---|---|
| [`01_Technical_Documentation.md`](../../../docs/01_Technical_Documentation.md) | Tech stack, architecture, project structure, security, deployment |
| [`02_User_Documentation.md`](../../../docs/02_User_Documentation.md) | End-user guide for Freelancers and Clients |
| [`03_Functional_Documentation.md`](../../../docs/03_Functional_Documentation.md) | Business rules, feature modules, workflows, permissions |
| [`04_System_Documentation.md`](../../../docs/04_System_Documentation.md) | Infrastructure, data flow, DB design, scalability |
| [`05_API_Documentation.md`](../../../docs/05_API_Documentation.md) | All REST API endpoints with request/response formats |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| Node.js 16+ | Runtime |
| Express.js 4.x | HTTP Framework |
| MongoDB + Mongoose | Database & ODM |
| Socket.IO | Real-time WebSocket |
| Helmet | HTTP Security Headers |
| express-mongo-sanitize | NoSQL Injection Prevention |
| express-rate-limit | Rate Limiting |
| bcryptjs | Password Hashing |
| jsonwebtoken | JWT Authentication |
| cookie-parser | Refresh Token (HTTP-only cookies) |
| multer + AWS SDK v3 | File Upload to AWS S3 |
| Nodemailer | Transactional Email |
| swagger-ui-express | Interactive API Documentation |

---

## 🚀 Getting Started

### Prerequisites

```
Node.js   v16+
npm       v8+
MongoDB   Atlas account (or local MongoDB 6.x)
AWS S3    Bucket configured
SMTP      Email credentials
```

### Installation

```bash
cd backend/kans_backend/mycontacts-backend
npm install
```

### Environment Configuration

Create a `.env` file in the root of `mycontacts-backend/`:

```env
PORT=5001
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/kansbe
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
AWS_ACCESS_KEY_ID=your_aws_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your_s3_bucket_name
EMAIL_USER=your_smtp_email
EMAIL_PASS=your_smtp_password
CLIENT_URL=http://localhost:4200
```

### Start the Server

```bash
node server.js
# Server starts on http://localhost:5001
# Swagger API Docs: http://localhost:5001/api-docs
```

---

## 📂 Project Structure

```
mycontacts-backend/
├── config/
│   ├── dbConnection.js       ← MongoDB connection
│   └── swagger.js            ← Swagger configuration
├── controllers/              ← Business logic handlers
├── middleware/
│   ├── validateTokenHandler.js  ← JWT verification
│   ├── errorHandler.js          ← Global error handler
│   ├── checkOwnership.js        ← Data ownership guards
│   └── upload.js                ← Multer + S3 upload middleware
├── models/                   ← Mongoose schemas
│   ├── userModel.js          ← Freelancer accounts
│   ├── cregisterModel.js     ← Client accounts
│   ├── cprojectModel.js      ← Projects + Tasks
│   ├── groupModel.js         ← Freelancer groups
│   ├── meetingModel.js       ← Meeting requests
│   ├── skillModel.js         ← Freelancer skills
│   ├── bankModels.js         ← Client bank details
│   ├── fbankmodel.js         ← Freelancer bank details
│   ├── chatModels.js         ← Chat messages
│   ├── supportModel.js       ← Support tickets
│   └── adminModel.js         ← Admin accounts
├── routes/                   ← Express route definitions
│   ├── userRoutes.js         ← /api/users
│   ├── cregisterRoutes.js    ← /api/cregister
│   ├── cprojectRoutes.js     ← /api/cproject
│   ├── groupRoutes.js        ← /api/groups
│   ├── meetingRoutes.js      ← /api/meetings
│   ├── skillRouter.js        ← /api/skills
│   ├── bankRoutes.js         ← /api/bank
│   ├── fbankRoutes.js        ← /api/fbank
│   ├── chatRoutes.js         ← /api/chat
│   ├── clientnotificationsRoutes.js  ← /api/notifications
│   ├── freelancernotificationsRoutes.js ← /api/fnotifications
│   ├── adminRoutes.js        ← /api/admin
│   ├── supportRoutes.js      ← /api/support
│   ├── dashboardRoutes.js    ← /api/dashboard
│   └── healthRoutes.js       ← /api/health
├── sockets/
│   ├── chatsocket.js         ← Real-time chat handler
│   └── notificationsocket.js ← Real-time notification handler
├── services/                 ← External service integrations
├── Utility/                  ← Helper utilities (mail limiter, etc.)
├── tests/                    ← Test files
├── .env                      ← Environment variables
└── server.js                 ← Application entry point
```

---

## 🔗 API Routes Overview

| Base Path | Description |
|---|---|
| `POST /api/users/register` | Freelancer registration |
| `POST /api/users/login` | Freelancer login |
| `POST /api/cregister/registeruser` | Client registration |
| `POST /api/cregister/login` | Client login |
| `POST /api/admin/login` | Admin login |
| `GET/PUT /api/users/:fl_id` | Freelancer profile management |
| `GET/PUT /api/cregister/:c_id` | Client profile management |
| `POST /api/cproject/createproject` | Post a new project |
| `GET /api/cproject/getproject/:p_id` | Get project by ID |
| `POST /api/groups/create` | Create freelancer group (Admin) |
| `PUT /api/cproject/:p_id/assign` | Assign group to project (Admin) |
| `GET/POST /api/cproject/:p_id/tasks` | Task management |
| `POST /api/meetings/request/:p_id` | Request a meeting |
| `PUT /api/meetings/approve/:p_id/:id` | Approve/reject meeting |
| `GET /api/chat/messages/:roomId` | Get chat history |
| `GET /api/notifications/:c_id` | Client notifications |
| `GET /api/fnotifications/:fl_id` | Freelancer notifications |
| `GET /api/health` | Server health check |
| `GET /api-docs` | Swagger interactive API docs |

> Full endpoint details → see [`05_API_Documentation.md`](../../../docs/05_API_Documentation.md)

---

## 🔒 Security

| Layer | Implementation |
|---|---|
| Password Hashing | bcryptjs |
| Access Tokens | Short-lived JWT (Bearer token) |
| Refresh Tokens | Long-lived JWT in HTTP-only cookie |
| Security Headers | Helmet.js |
| NoSQL Injection | express-mongo-sanitize |
| Auth Rate Limit | 15 requests / 10 min |
| API Rate Limit | 100 requests / 10 min |
| CORS | Restricted to `CLIENT_URL` |
| Ownership Guards | `checkOwnership`, `checkOwnershipOrAdmin` |
| Admin Guards | `checkAdmin()` |

---

## ⚡ WebSocket Events

| Event | Direction | Purpose |
|---|---|---|
| `register` | Client → Server | User registers to personal notification channel |
| `notification` | Server → Client | Real-time notification delivery |
| `joinRoom` | Client → Server | Join a chat room |
| `sendMessage` | Client → Server | Send a chat message |
| `receiveMessage` | Server → Client | Receive chat message |

---

## 🧪 Testing

```bash
npm test          # Run all tests
```

Test files are located in the `tests/` directory.

Interactive API testing is available at:
```
http://localhost:5001/api-docs
```

---

## 🚢 Production Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start in cluster mode (uses all CPU cores)
pm2 start server.js -i max --name kansbe-api

# Save PM2 config & enable auto-start on reboot
pm2 save
pm2 startup
```

### Nginx Reverse Proxy (example)

```nginx
server {
    listen 443 ssl;
    server_name api.kansbe.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🤝 Frontend

The Angular frontend runs at `http://localhost:4200`. See the [Frontend README](../../../frontend/kans_frontend/kans_applications/README.md) for setup instructions.

---

*© 2026 KANSBE Platform*
