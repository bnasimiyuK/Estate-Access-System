// backend/controllers/accesslogsController.js
import sql from "mssql";
import { dbPool } from "../server.js";

/**
 * Get Access Logs with optional date filter
 * @route GET /api/accesslogs
 */
export const getaccesslogs = async (req, res) => {
    try {
        const { from, to } = req.query;

        const pool = await dbPool;

        let query = `
            SELECT 
                Id,
                TimestampUtc,
                UserId,
                Action,
                Resource,
                IpAddress,
                UserAgent,
                Referrer,
                Metadata,
                LogType
            FROM accesslogs
            WHERE 1 = 1
        `;

        if (from) query += ` AND TimestampUtc >= @from`;
        if (to) query += ` AND TimestampUtc <= @to`;

        const request = pool.request();
        if (from) request.input("from", sql.DateTime, new Date(from));
        if (to) request.input("to", sql.DateTime, new Date(to));

        const result = await request.query(query);

        res.status(200).json({
            success: true,
            total: result.recordset.length,
            logs: result.recordset,
        });
    } catch (error) {
        console.error("Get Logs Error: ", error);
        res.status(500).json({ message: "Server error fetching logs" });
    }
};


/**
 * Create a log entry (system use)
 * @route POST /api/accesslogs
 */
export const createAccessLog = async (req, res) => {
    try {
        const {
            UserId,
            Action,
            Resource,
            IpAddress,
            UserAgent,
            Referrer,
            Metadata,
            LogType
        } = req.body;

        const pool = await dbPool;

        await pool.request()
            .input("TimestampUtc", sql.DateTime, new Date())
            .input("UserId", sql.VarChar(255), UserId)
            .input("Action", sql.VarChar(255), Action)
            .input("Resource", sql.VarChar(255), Resource)
            .input("IpAddress", sql.VarChar(255), IpAddress)
            .input("UserAgent", sql.VarChar(sql.MAX), UserAgent)
            .input("Referrer", sql.VarChar(255), Referrer)
            .input("Metadata", sql.VarChar(sql.MAX), Metadata)
            .input("LogType", sql.VarChar(50), LogType)
            .query(`
                INSERT INTO accesslogs (
                    TimestampUtc, UserId, Action, Resource, 
                    IpAddress, UserAgent, Referrer, Metadata, LogType
                )
                VALUES (
                    @TimestampUtc, @UserId, @Action, @Resource,
                    @IpAddress, @UserAgent, @Referrer, @Metadata, @LogType
                )
            `);

        res.status(201).json({ success: true, message: "Log stored successfully" });

    } catch (error) {
        console.error("Create Log Error: ", error);
        res.status(500).json({ message: "Server error saving log" });
    }
};
