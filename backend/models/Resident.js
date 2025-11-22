// backend/models/Resident.js
const { getPool } = require('../db');

async function getAllResidents() {
  const pool = await getPool();
  const result = await pool.request().query('SELECT * FROM Residents ORDER BY FullName');
  return result.recordset;
}

async function getResidentByEmail(email) {
  const pool = await getPool();
  const result = await pool.request().input('Email', email).query('SELECT * FROM Residents WHERE Email = @Email');
  return result.recordset[0];
}

async function getResidentById(id) {
  const pool = await getPool();
  const result = await pool.request().input('ResidentID', id).query('SELECT * FROM Residents WHERE ResidentID = @ResidentID');
  return result.recordset[0];
}

async function createResident(resident) {
  const pool = await getPool();
  await pool.request()
    .input('FullName', resident.FullName)
    .input('Email', resident.Email)
    .input('PasswordHash', resident.PasswordHash)
    .input('HouseNumber', resident.HouseNumber)
    .input('PaymentStatus', resident.PaymentStatus || 'Pending')
    .query(`INSERT INTO Residents (FullName, Email, PasswordHash, HouseNumber, PaymentStatus, CreatedAt)
            VALUES (@FullName, @Email, @PasswordHash, @HouseNumber, @PaymentStatus, GETDATE())`);
  return { success: true };
}

async function updatePaymentStatus(residentId, status) {
  const pool = await getPool();
  await pool.request()
    .input('ResidentID', residentId)
    .input('PaymentStatus', status)
    .query('UPDATE Residents SET PaymentStatus = @PaymentStatus WHERE ResidentID = @ResidentID');
  return { success: true };
}

module.exports = { getAllResidents, getResidentByEmail, getResidentById, createResident, updatePaymentStatus };
