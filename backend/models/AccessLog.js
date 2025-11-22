// backend/models/AccessLog.js
const { getPool } = require('../db');

async function logAccessAttempt(log) {
  const pool = await getPool();
  await pool.request()
    .input('UserType', log.UserType)
    .input('UserID', log.UserID)
    .input('Action', log.Action)
    .input('Result', log.Result)
    .query(`INSERT INTO AccessLogs (UserType, UserID, Action, Result, Timestamp)
            VALUES (@UserType, @UserID, @Action, @Result, GETDATE())`);
  return { success: true };
}

async function getAllLogs() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM AccessLogs ORDER BY Timestamp DESC');
  return result.recordset;
}

async function getLogsByUser(userId) {
  const pool = await getPool();
  const result = await pool.request().input('UserID', userId)
    .query('SELECT * FROM AccessLogs WHERE UserID = @UserID ORDER BY Timestamp DESC');
  return result.recordset;
}

module.exports = { logAccessAttempt, getAllLogs, getLogsByUser };
