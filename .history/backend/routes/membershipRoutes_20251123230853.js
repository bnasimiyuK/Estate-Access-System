import express from 'express';
import { 
    getMembershipCount, 
    getCourtList, 
    submitMembershipRequest 
} from '../controllers/membershipController.js';

const router = express.Router();

// Publicly available endpoints (as defined by your frontend JS)
// Mounted under /api/membership/

// 1. GET /api/membership/count
router.get('/count', getMembershipCount);

// 2. GET /api/membership/courts
router.get('/courts', getCourtList);

// 3. POST /api/membership/request
router.post('/request', submitMembershipRequest);

export default router;