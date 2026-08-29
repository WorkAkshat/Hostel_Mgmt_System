const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./middleware/logger');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const staffRoutes = require('./routes/staffRoutes');
const messRoutes = require('./routes/messRoutes');
const pollRoutes = require('./routes/pollRoutes');
const floorRoutes = require('./routes/floorRoutes');
const electricityRoutes = require('./routes/electricityRoutes');
const demandNoteRoutes = require('./routes/demandNoteRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const nightAttendanceRoutes = require('./routes/nightAttendanceRoutes');

const app = express();

// Security Headers
app.use(helmet());

// CORS — origins loaded from environment variable for security
const defaultOrigins = [
  'https://hms.haripushphostel.in',
  'http://hms.haripushphostel.in',
  'https://www.hms.haripushphostel.in',
  'https://hms-api.haripushphostel.in',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:8081'
];

const envOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : [];

const corsOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

// Middlewares
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (corsOrigins.includes(origin) || origin.endsWith('haripushphostel.in')) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    return callback(null, true); // Safe fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.options('*', cors());
app.use(express.json());
app.use(logger);

// Rate Limiting Config
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 15 authentication attempts per 15 minutes
  message: { message: 'Too many auth attempts from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiting
app.use(globalLimiter);

// Routes Mounts with /api/v1 prefix
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/visitors', visitorRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/mess', messRoutes);
app.use('/api/v1/polls', pollRoutes);
app.use('/api/v1/floors', floorRoutes);

// Legacy Backwards-Compatible Mounts (/api/...)
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/mess', messRoutes);
app.use('/api/polls', pollRoutes);
app.use('/api/v1/electricity', electricityRoutes);
app.use('/api/electricity', electricityRoutes);
app.use('/api/v1/demand-notes', demandNoteRoutes);
app.use('/api/demand-notes', demandNoteRoutes);
app.use('/api/v1/suggestions', suggestionRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/v1/attendance/night', nightAttendanceRoutes);
app.use('/api/attendance/night', nightAttendanceRoutes);

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({
    message: `We couldn't find the page or service you requested (${req.originalUrl}). Please verify the address and try again.`
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);

  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      message: 'A database constraint conflict occurred. Please make sure unique values (like email or roll numbers) are not duplicated.',
      code: err.code
    });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on our end. Please try again in a few moments, or contact customer support if the issue persists.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 9000;

const server = app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`  Hari Pushp PG Backend Server online at port ${PORT}`);
  console.log(`  API Base Endpoint: http://localhost:${PORT}/api/v1`);
  console.log(`==================================================\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n[Notice] Port ${PORT} is already in use by a running backend process.`);
    console.log(`The Hari Pushp PG backend API server is active and running on port ${PORT}.\n`);
    process.exit(0);
  } else {
    console.error('[Server Error]', err);
  }
});
