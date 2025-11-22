// update_password.js

// ⚠️ IMPORTANT: Ensure the relative path to your db.js is correct.
import sql, { getPool } from "./config/db.js"; 

// ===============================================
// 🔑 USER AND HASH DEFINITIONS
// ===============================================

// 1. The Username (email) of the user to be reset
const TARGET_USERNAME = "vidithpraise@gmail.com"; 

// 2. The new hash generated (copied from previous output)
const NEW_PASSWORD_HASH = "$2a$10$BjuHVGAR864wyyIPARwe4eOho6CbgMc0dzjv6QgaUjlX7IAr2pe9u";

// 3. The temporary password (needed for notification)
const TEMPORARY_PASSWORD = "TemporaryPassword2025!"; // Must match the password used to generate the hash

// ===============================================

async function updatePassword() {
    console.log(`\nAttempting to reset password for: ${TARGET_USERNAME}`);

    if (NEW_PASSWORD_HASH.length < 50) {
        console.error("❌ ERROR: The provided hash appears too short or invalid.");
        return;
    }

    let pool;
    try {
        // 1. Get the shared database connection pool
        pool = await getPool(); 
        
        console.log("Database connection successful. Executing update...");

        // 2. Execute the UPDATE query
        const request = pool.request();
        
        // Input the variables securely
        request.input("NewHash", sql.NVarChar, NEW_PASSWORD_HASH);
        request.input("Username", sql.NVarChar, TARGET_USERNAME);
        
        const result = await request.query(`
            UPDATE Users
            SET PasswordHash = @NewHash
            WHERE Username = @Username;
        `);

        // 3. Check for successful update
        if (result.rowsAffected && result.rowsAffected[0] === 1) {
            console.log("=========================================");
            console.log(`✅ SUCCESS: Password hash updated for ${TARGET_USERNAME}.`);
            console.log(`   New Password Hash: ${NEW_PASSWORD_HASH.substring(0, 30)}...`);
            console.log(`   User's Temporary Password is: **${TEMPORARY_PASSWORD}**`);
            console.log("=========================================");
            console.log("ACTION REQUIRED: Notify the user of their temporary password.");
        } else {
            console.error(`❌ FAILURE: User '${TARGET_USERNAME}' not found or no change was made.`);
        }

    } catch (error) {
        console.error("❌ FATAL ERROR during password update:", error.message);
    } finally {
        // Note: We don't close the pool here because it's a shared resource managed by getPool()
    }
}

updatePassword();