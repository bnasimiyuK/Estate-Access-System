// Example: routes/logsRoutes.js

const express = require('express');
const router = express.Router();

// Import the authentication and authorization middleware. 
// We use 'authenticateJWT' for token validation and 'isAdmin' for the 
// critical role check (Admin Level 1) required for logs access.
const { authenticateJWT, isAdmin } = require('../middleware/auth'); 
const logsController = require('../controllers/logsController'); 

/**
 * Route: GET /api/logs/gate_overrides
 * Access: Requires both JWT authentication AND Admin (Level 1) role check.
 */
router.get('/gate_overrides', authenticateJWT, isAdmin, logsController.getGateOverrideLogs);

module.exports = router;