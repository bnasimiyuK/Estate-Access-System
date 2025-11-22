// backend/models/Visitor.js
const { getPool } = require('../db');

async function registerVisitor(visitor) {
  const pool = await getPool();
  await pool.request()
    .input('FullName', visitor.FullName)
    .input('Contact', visitor.Contact)
    .input('ResidentID', visitor.ResidentID)
    .input('VisitDate', visitor.VisitDate)
    .input('Status', visitor.Status || 'Pending')
    .query(`INSERT INTO Visitors (FullName, Contact, ResidentID, VisitDate, Status)
            VALUES (@FullName, @Contact, @ResidentID, @VisitDate, @Status)`);
  return { success: true };
}

async function getVisitors() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Visitors ORDER BY VisitDate DESC');
  return result.recordset;
}

async function getVisitorsByResident(residentId) {
  const pool = await getPool();
  const result = await pool.request().input('ResidentID', residentId)
    .query('SELECT * FROM Visitors WHERE ResidentID = @ResidentID ORDER BY VisitDate DESC');
  return result.recordset;
}

async function updateVisitorStatus(visitorId, status) {
  const pool = await getPool();
  await pool.request().input('VisitorID', visitorId).input('Status', status)
    .query('UPDATE Visitors SET Status = @Status WHERE VisitorID = @VisitorID');
  return { success: true };
}

module.exports = { registerVisitor, getVisitors, getVisitorsByResident, updateVisitorStatus };
