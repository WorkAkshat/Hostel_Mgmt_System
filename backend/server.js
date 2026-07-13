const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const visitorRoutes = require('./routes/visitorRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const staffRoutes = require('./routes/staffRoutes');
const messRoutes = require('./routes/messRoutes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*', // For development. Real production would restrict to specific domains.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes Mounts
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/mess', messRoutes);


// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ message: `API Route not found: ${req.originalUrl}` });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    message: 'An unexpected internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`HMS Backend Server running on port ${PORT}...`);
});
