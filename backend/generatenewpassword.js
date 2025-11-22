import bcrypt from "bcryptjs";

const plainPassword = "Admin123"; // Choose a new password
const saltRounds = 10;

const hash = await bcrypt.hash(plainPassword, saltRounds);
console.log("New hash:", hash);
