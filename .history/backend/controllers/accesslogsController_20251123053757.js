// backend/controllers/accessLogsController.js
import sql from "mssql";
import { dbPool } from "../server.js";

/**
 * Get all access logs
 */
export async function getaccesslogs(req, res) {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .query(`SELECT TOP (1000)
                    [Id], [TimestampUtc], [UserId], [Action], [Resource],
                    [IpAddress], [UserAgent], [Referrer], [Metadata], [LogType]
                    FROM [EstateAccessManagementSystem].[dbo].[accesslogs]`);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching access logs" });
    }
}

/**
 * Create a new access log
 */
export async function createaccesslog(req, res) {
    try {
        const { UserId, Action, Resource, IpAddress, UserAgent, Referrer, Metadata, LogType } = req.body;
        const pool = await dbPool;
        await pool.request()
            .input("UserId", sql.Int, UserId)
            .input("Action", sql.VarChar, Action)
            .input("Resource", sql.VarChar, Resource)
            .input("IpAddress", sql.VarChar, IpAddress)
            .input("UserAgent", sql.VarChar, UserAgent)
            .input("Referrer", sql.VarChar, Referrer)
            .input("Metadata", sql.VarChar, Metadata)
            .input("LogType", sql.VarChar, LogType)
            .query(`INSERT INTO [accesslogs] 
                    (UserId, Action, Resource, IpAddress, UserAgent, Referrer, Metadata, LogType, TimestampUtc)
                    VALUES (@UserId, @Action, @Resource, @IpAddress, @UserAgent, @Referrer, @Metadata, @LogType, GETUTCDATE())`);
        res.status(201).json({ message: "Access log created" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error creating access log" });
    }
}
