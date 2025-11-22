import bcrypt from "bcrypt";

async function hashPassword() {
  const password = "Security123";
  const saltRounds = 10;

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  console.log("Hashed password:", hashedPassword);
}

hashPassword();


$2b$10$CV9avMyfC52.VreGBAvTweg2xD95hDW8qGDH/gC3No9Nx97xvdh2G

