import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import passport from "passport";

import configurePassport from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import projectRoutes from "./routes/projects.js"; // Import new routes
import taskRoutes from "./routes/tasks.js";     // Import new routes
import teamRoutes from "./routes/team.js";       // Import new routes
import reportRoutes from "./routes/reports.js";
import recoveryRoutes from "./routes/recovery.js";
import enhancedRecoveryRoutes from "./routes/enhancedRecovery.js";
import notificationRoutes from './routes/notifications.js';
import securityRoutes from './routes/security.js';
import twoFARoutes from './routes/2fa.js';
import statusRequestRoutes from './routes/statusRequests.js';
import taskReportRoutes from './routes/taskReports.js';
import messageRoutes from './routes/messages.js';


const app = express();
// Allow common local dev origins; can be extended via ENV (comma-separated)
const extraOrigins = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...extraOrigins
]);
const server = http.createServer(app);
const io = new SocketIO(server, {
  cors: {
    origin: Array.from(allowedOrigins),
    credentials: true
  }
});
configurePassport(passport);

// --- Core Middleware ---
app.use(express.json());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('CORS_NOT_ALLOWED'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ DB Error", err));

// --- Socket.io Project Chat ---
io.on("connection", (socket) => {
  socket.on("joinProject", (projectId) => {
    socket.join(projectId);
  });
  socket.on("projectMessage", ({ projectId, userId, text, file }) => {
    io.to(projectId).emit("projectMessage", { projectId, userId, text, file, timestamp: Date.now() });
    // Optionally: Save to Message model here
  });
});

app.use(passport.initialize());

// --- Health / Ping ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// API Routes

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes); // Use new routes
app.use("/api/tasks", taskRoutes);     // Use new routes
app.use("/api/team", teamRoutes);       // Use new routes
app.use("/api/reports", reportRoutes);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/enhanced-recovery", enhancedRecoveryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/2fa', twoFARoutes);
app.use('/api/status-requests', statusRequestRoutes);
app.use('/api/task-reports', taskReportRoutes);
app.use('/api/messages', messageRoutes);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// --- 404 Fallback (only for /api) ---
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// --- Global Error Handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({ success: false, error: 'Origin not allowed by CORS' });
  }
  console.error('Unhandled Error:', err); // minimal structured logging
  if (res.headersSent) return; // avoid double send
  res.status(500).json({ success: false, error: 'Internal server error' });
});
