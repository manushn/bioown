import express from 'express';
import cors from 'cors';
import { initDatabase } from './database/init.js';
import { checkAndProcessRestoreInbox } from './backup/backupManager.js';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for web UI and Electron
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && req.path !== '/api/device/status') {
      console.log(`[HTTP] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'College Staff Attendance Local API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount main API
app.use('/api', apiRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
async function startServer() {
  try {
    // 1. Initialize DB schema, default admin, and seed data
    await initDatabase();

    // 2. Scan restore-inbox for automatically dropped newer backups
    try {
      await checkAndProcessRestoreInbox();
    } catch (e) {
      console.warn('[RESTORE-INBOX] Scan warning:', e.message);
    }

    // Check restore-inbox every 30 seconds in background
    setInterval(async () => {
      try {
        await checkAndProcessRestoreInbox();
      } catch (e) {
        // silent
      }
    }, 30000);

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(` College Staff Attendance Local API running`);
      console.log(` Listening on: http://127.0.0.1:${PORT}`);
      console.log(` Health check: http://127.0.0.1:${PORT}/health`);
      console.log(`====================================================`);
    });

    return server;
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();

export default app;

