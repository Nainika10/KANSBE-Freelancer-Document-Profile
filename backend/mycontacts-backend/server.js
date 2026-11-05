


const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const cors = require("cors");
const chatsocket = require("./sockets/chatsocket");
const notificationsocket = require("./sockets/notificationsocket");
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { swaggerUi, swaggerSpec } = require('./config/swagger');

connectDb();
require('./config/redis'); // Initialize Redis connection on boot
const app = express();
const port = process.env.PORT || 80;

app.set('trust proxy', 1); // Trust first proxy (e.g. Nginx, Cloudflare)

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    // origin: "http://localhost:4200",
    origin: ["http://localhost:4200", "https://kansbe.com"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  },
  transports: ["polling", "websocket"],
  path: "/socket.io/"
});

// Attach io to Express app
app.set("io", io);
// Pass io to both socket handlers
notificationsocket(io);
chatsocket(io);

// Security Middlewares
app.use(helmet()); // Secure HTTP headers
app.use(mongoSanitize()); // Prevent NoSQL injection by sanitizing keys with $ or .

// Body Parsers with stricter limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use(cors({
  // origin: "http://localhost:4200",
  origin: ["http://localhost:4200", "https://kansbe.com"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(cookieParser());

// Rate Limiters â€” essential for production security
// Protects against: DDoS, brute-force attacks, data scraping, and server overload

// General API limiter (for all /api routes except auth)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 min â€” generous for SPA (each page = 3-5 API calls)
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter (login/register/forgot password only â€” keep strict)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts â€” stops brute-force attacks
  message: { message: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific Auth limiters (Applied BEFORE generic routes)
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
app.use('/api/users/forgotpassword', authLimiter);
app.use('/api/cregister/login', authLimiter);
app.use('/api/cregister/register', authLimiter);
app.use('/api/users/resend-verification', authLimiter);
app.use('/api/cregister/resend-verification', authLimiter);
app.use('/api/admin/login', authLimiter);

// Apply global api limiter to everything ELSE under /api
// We skip the auth routes already handled above to avoid double-counting
app.use('/api', (req, res, next) => {
  const authRoutes = ['/users/login', '/users/register', '/users/forgotpassword', '/users/resend-verification', '/cregister/login', '/cregister/register', '/cregister/resend-verification', '/admin/login'];
  if (authRoutes.some(route => req.path.includes(route))) {
    return next();
  }
  apiLimiter(req, res, next);
});

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "KansBe API Documentation"
}));

// Routes
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/skills", require("./routes/skillRouter"));
app.use("/api/cproject", require("./routes/cprojectRoutes"));
app.use("/api/cregister", require("./routes/cregisterRoutes"));
app.use("/api/bank", require("./routes/bankRoutes"));
app.use("/api/fbank", require("./routes/fbankRoutes"));
app.use("/api/health", require("./routes/healthRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/fnotifications", require("./routes/freelancernotificationsRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/groups", require("./routes/groupRoutes"));
app.use("/api/meetings", require("./routes/meetingRoutes"));
app.use("/api/news", require("./routes/newsRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/learning", require("./routes/learningRoutes"));
app.use("/api/admin/learning", require("./routes/adminLearningRoutes"));
app.use("/api/freelancer-duration", require("./routes/freelancerDurationRoutes"));
app.use("/api/lookups", require("./routes/lookupRoutes"));
// Error Handler - MUST BE LAST
app.use(errorHandler);

app.get("/api/test-server", (req, res) => {
  res.send("Server is running!");
});





// Initialize background workers for queue processing
require('./workers/emailWorker');

// Import and start background cron jobs
try {
  const { startTaskReminderCron } = require('./controllers/taskReminderService');
  startTaskReminderCron();
  console.log("Task Reminder Cron Job Initialized.");
} catch (err) {
  console.warn("Could not start cron jobs. Ensure 'node-cron' is installed.");
}

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger docs available at https://kansbe.com/api-docs`);
});
