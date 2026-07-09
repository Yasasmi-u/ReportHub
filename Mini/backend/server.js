import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupDatabase, seedDatabase } from './database.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import reportRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database connection...');
    await setupDatabase();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`==========================================`);
      console.log(`Backend server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`==========================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

startServer();
