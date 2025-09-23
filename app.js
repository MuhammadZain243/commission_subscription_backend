// app.js - Simple setup with essential middleware only

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import essential middleware
const { errorHandler, notFound, responseFormatter } = require('./middlewares');

// Import routes
const routes = require('./routes');
const { env } = require('./config');

const app = express();

// ========================
// BASIC SECURITY & SETUP
// ========================

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logger
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========================
// CUSTOM MIDDLEWARE
// ========================

// Response formatter (adds success, error, paginated methods to res)
app.use(responseFormatter);

// ========================
// ROUTES
// ========================

// Health check route
app.get('/health', (req, res) => {
  res.success(
    {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
    'API is running successfully'
  );
});

// API routes
app.use('/api', routes);

// ========================
// ERROR HANDLING
// ========================

// Handle undefined routes (404)
app.use(notFound);

// Global error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
