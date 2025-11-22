// backend/models/Payment.js
const { getPool } = require('../db');

async function addPayment(payment) {
  const pool = await getPool();
  await pool.request()
    .input('ResidentID', payment.ResidentID)
    .input('Amount', payment.Amount)
    .input('PaymentDate', payment.PaymentDate || new Date())
    .input('Reference', payment.Reference)
    .input('Status', payment.Status || 'Paid')
    .query(`INSERT INTO Payments (ResidentID, Amount, PaymentDate, Reference, Status)
            VALUES (@ResidentID, @Amount, @PaymentDate, @Reference, @Status)`);
  return { success: true };
}

async function getAllPayments() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Payments ORDER BY PaymentDate DESC');
  return result.recordset;
}

async function getPaymentsByResident(residentId) {
  const pool = await getPool();
  const result = await pool.request().input('ResidentID', residentId)
    .query('SELECT * FROM Payments WHERE ResidentID = @ResidentID ORDER BY PaymentDate DESC');
  return result.recordset;
}

async function verifyPayment(residentId) {
  const pool = await getPool();
  const result = await pool.request().input('ResidentID', residentId)
    .query('SELECT TOP 1 Status, PaymentDate FROM Payments WHERE ResidentID = @ResidentID ORDER BY PaymentDate DESC');
  return result.recordset[0];
}

module.exports = { addPayment, getAllPayments, getPaymentsByResident, verifyPayment };
