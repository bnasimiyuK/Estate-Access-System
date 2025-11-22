// resetpassword.js (Using ES Module syntax 'import')

// 💡 FIX: Use import instead of require
import bcrypt from "bcryptjs"; 

// ===============================================
// 🔑 STEP 1: DEFINE THE NEW PASSWORD
// ===============================================
const newPassword = "NewPassword2025!"; 
// IMPORTANT: Change this to a secure temporary password.

async function generateHash() {
    const saltRounds = 10; 
    
    try {
        console.log("Generating secure bcrypt hash...");
        
        // Hash the new password
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        
        // ----------------- OUTPUT START -----------------
        console.log("=========================================");
        console.log(`User's Temporary Password: ${newPassword}`);
        console.log(`\n✅ New PasswordHash for the Database (COPY THIS ENTIRE STRING):`);
        console.log(newHash); 
        console.log("=========================================");
        // ----------------- OUTPUT END -----------------
        
    } catch (error) {
        console.error("❌ ERROR: Failed to generate hash. Ensure 'bcryptjs' is installed.", error.message);
    }
}

generateHash();