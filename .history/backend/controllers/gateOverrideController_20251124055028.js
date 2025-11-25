// backend/controllers/gateOverrideController.js
import { dbPool } from "../server.js"; // your server.js must export dbPool

// Named export: must match the import
export async function getGateOverrideLogs(req, res) {
    try {
        const result = await dbPool.request().query(`
            SELECT TOP (1000) 
                [id],
                [gateId],
                [action],
                [reason],
                [userId],
                [createdAt]
            FROM [EstateAccessManagementSystem].[dbo].[gate_overrides]
            ORDER BY createdAt DESC
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching gate override logs:", err.message);
        res.status(500).json({ message: "Failed to retrieve gate override logs", error: err.message });
    }
}
