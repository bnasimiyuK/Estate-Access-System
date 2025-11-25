import { dbPool } from '../server.js'; // or wherever your DB connection is
// OR import your database query module

// GET Access Logs
export async function getaccesslogs(req, res) {
  try {
    const result = await dbPool.request()
      .query(`SELECT Timestamp, UserId, Action, LogType FROM accesslogs ORDER BY Timestamp DESC`);
    
    const logs = result.recordset; // MSSQL returns recordset
    res.json(logs);
  } catch (err) {
    console.error('Error fetching access logs:', err);
    res.status(500).json({ message: 'Failed to fetch access logs' });
  }
}
