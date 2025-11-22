// backend/hashExistingPasswords.js
import bcrypt from "bcryptjs";
import { getPool } from "./config/db.js"; // ✅ Correct import path for your setup
import sql from "mssql";

const hashExistingPasswords = async () => {
  try {
    console.log("🔗 Connecting to database...");
    const pool = await getPool();

    console.log("📦 Fetching all users...");
    const result = await pool.request().query("SELECT UserID, Username, PasswordHash FROM Users");

    let updatedCount = 0;
    for (const user of result.recordset) {
      const { UserID, Username, PasswordHash } = user;

      // Skip already-hashed passwords
      if (PasswordHash && PasswordHash.startsWith("$2")) {
        console.log(`⏭️  Skipping already-hashed user: ${Username}`);
        continue;
      }

      // Hash plain-text password
      const newHash = await bcrypt.hash(PasswordHash, 10);
      await pool.request()
        .input("UserID", sql.Int, UserID)
        .input("PasswordHash", sql.NVarChar, newHash)
        .query("UPDATE Users SET PasswordHash = @PasswordHash WHERE UserID = @UserID");

      console.log(`🔒 Hashed password for: ${Username} (UserID: ${UserID})`);
      updatedCount++;
    }

    console.log(`✅ Done! Updated ${updatedCount} user(s).`);
    process.exit(0);

  } catch (error) {
    console.error("❌ Error hashing passwords:", error);
    process.exit(1);
  }
};

hashExistingPasswords();
