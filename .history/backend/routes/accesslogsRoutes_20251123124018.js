    // ===============================================
    // CORRECTED: ./routes/accesslogsRoutes.js
    // Fixes the 404 error by changing the GET path
    // ===============================================

    import express from "express";
    import { getaccesslogs, createaccesslog } from "../controllers/accesslogsController.js";

    const router = express.Router();

    // 🟢 CORRECTED: Changed the path from "/" to "/logs"
    // Combined with the server mount point of "/api/access", 
    // this creates the full working path: /api/access/logs
    // in accesslogsRoutes.js
     router.get("/accesslogs", getaccesslogs);  // now full URL = /api/admin/accesslogs
 // now matches /api/admin/accesslogs


    // POST a new accesslog (Path remains /api/access)
    router.post("/", createaccesslog);

    export default router;