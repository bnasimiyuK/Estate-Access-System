const express = require('express');
const router = express.Router();
// Assuming you have middleware for JWT validation (authentication)
const { protect } = require('../middleware/authMiddleware'); 
// Assuming a new controller file for membership logic
const membershipController = require('../controllers/membershipController');

// All membership routes should typically require authentication
router.use(protect);

// ===================================
// 1. RESIDENT RECORDS
// Maps to: GET /api/residents/records
// Used by: fetchAndRenderRecords() in resident_records.js
// SQL Equivalent: SELECT TOP (1000) [ResidentName], [NationalID], ...
// ===================================

/**
 * @route GET /api/residents/records
 * @desc Get a list of resident membership records (max 1000)
 * @access Private (Requires 'Admin' or 'MembershipManager' role)
 */
router.get('/residents/records', membershipController.getResidentRecords);


// ===================================
// 2. ADDITIONAL MEMBER ROUTES (Commonly needed)
// ===================================

/**
 * @route GET /api/residents/:id
 * @desc Get details for a single resident by ID
 * @access Private
 */
// router.get('/residents/:id', membershipController.getResidentDetails);

/**
 * @route POST /api/residents/new
 * @desc Create a new resident membership record
 * @access Private
 */
// router.post('/residents/new', membershipController.createResidentRecord);

module.exports = router;