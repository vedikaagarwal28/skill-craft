// ============================================================================
// SkillCraft Micro-Jobs API Server
// BCSE302P – Database Systems Lab, Societal Digital Innovation Project
// ============================================================================
// Express.js REST API with PostgreSQL backend
// - JWT authentication with role-based access control
// - Parameterized queries to prevent SQL injection
// - Transaction-safe bid acceptance with row locking
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import artisansRoutes from './routes/artisans.routes.js';
import gigsRoutes from './routes/gigs.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import combinedRoutes from './routes/combined.routes.js';
import { authenticateToken } from './middleware/auth.js';
import { closePool } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// Middleware
// ============================================================================

// CORS (allow frontend to make requests)
app.use(cors({
  origin: process.env.CORS_ORIGIN || ['http://localhost:5173', 'http://localhost:3000'],
}));

// Body parser
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Check Endpoint
// ============================================================================
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// Routes
// ============================================================================

// Public auth routes (no JWT required)
app.use('/api/auth', authRoutes);

// Artisans routes
app.use('/api/artisans', artisansRoutes);

// Gigs routes
app.use('/api/gigs', gigsRoutes);

// Applications routes
app.use('/api', applicationsRoutes);

// Contracts, Reviews, and Dashboard routes (combined)
app.use('/api', combinedRoutes);

// ============================================================================
// 404 Handler
// ============================================================================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ============================================================================
// Error Handler
// ============================================================================
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ============================================================================
// Server Startup
// ============================================================================
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  SkillCraft Micro-Jobs API                                 ║
║  Database Systems Lab Project (BCSE302P)                   ║
╠════════════════════════════════════════════════════════════╣
║  Server running at http://localhost:${PORT}
║  Environment: ${process.env.NODE_ENV || 'development'}
║  Health check: http://localhost:${PORT}/health
╚════════════════════════════════════════════════════════════╝
  `);
});

// ============================================================================
// Graceful Shutdown
// ============================================================================
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closePool();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await closePool();
    process.exit(0);
  });
});

export default app;
