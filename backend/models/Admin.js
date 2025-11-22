// backend/models/Admin.js
const { getPool } = require('../db');

async function getAdminByEmail(email) {
  const pool = await getPool();
  const result = await pool.request().input('Email', email).query('SELECT * FROM Admins WHERE Email = @Email');
  return result.recordset[0];
}

async function createAdmin(admin) {
  const pool = await getPool();
  await pool.request()
    .input('FullName', admin.FullName)
    .input('Email', admin.Email)
    .input('PasswordHash', admin.PasswordHash)
    .input('Role', admin.Role || 'Admin')
    .query(`INSERT INTO Admins (FullName, Email, PasswordHash, Role, CreatedAt)
            VALUES (@FullName, @Email, @PasswordHash, @Role, GETDATE())`);
  return { success: true };
}

module.exports = { getAdminByEmail, createAdmin };
