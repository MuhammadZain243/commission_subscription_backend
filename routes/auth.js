const express = require('express');
const router = express.Router();

// Placeholder routes - will be implemented later
router.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Auth routes - Coming soon',
    endpoints: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/refresh-token',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
    ],
  });
});

module.exports = router;
