const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const routes = require('./routes');
// const errorHandler = require('./src/middleware/errorHandler');
const { env } = require('./config');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api', routes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Commission Subscription API is running',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Handle 404 routes - FIXED: Removed the '*' wildcard
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
// app.use(errorHandler);

module.exports = app;
