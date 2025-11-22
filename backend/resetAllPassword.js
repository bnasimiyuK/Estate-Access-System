// ==========================================
// resetAllPasswords.js — Hash or Reset Passwords for All Users
// ==========================================
import bcrypt from "bcryptjs";
import sql from "mssql";
import dotenv from "dotenv";
import dbConfig from "./config/db.js";

dotenv.config();

async function resetAllPasswords(defaultPassword = "ChangeMe@123") {
  try {
    console.log("🔗 Connecting to database...");
    const pool = await sql.connect(dbConfig);
    console.log("✅ Connected to SQL Server.");

    // ✅ Get all users
    const result = await pool.request().query(`
      SELECT UserID, Username, PasswordHash
      FROM Users
    `);

    const users = result.recordset;
    console.log(`📦 Found ${users.length} users.`);

    let updated = 0;

    for (const user of users) {
      // Skip already-hashed passwords
      if (user.PasswordHash && user.PasswordHash.startsWith("$2")) {
        console.log(`⏭️  Skipping already-hashed user: ${user.Username}`);
        continue;
      }

      // Hash a new password (default or based on username)
      const newPassword = defaultPassword;
      const newHash = await bcrypt.hash(newPassword, 10);

      await pool.request()
        .input("UserID", sql.Int, user.UserID)
        .input("PasswordHash", sql.NVarChar, newHash)
        .query(`
          UPDATE Users
          SET PasswordHash = @PasswordHash
          WHERE UserID = @UserID
        `);

      console.log(`✅ Updated password for ${user.Username}`);
      updated++;
    }

    console.log(`🎉 Done! Updated ${updated} user(s).`);
    sql.close();
  } catch (err) {
    console.error("❌ Error resetting passwords:", err);
    sql.close();
  }
}

// ==========================================
// 🔧 Usage:
// This will set all plain-text or missing passwords
// to "Cha
