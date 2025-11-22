import bcrypt from "bcryptjs";

const passwords = [
  { name: "Admin User", email: "admin@estate.com", password: "Admin@123", roleID: 1 },
  { name: "Resident One", email: "resident1@estate.com", password: "Resident@123", roleID: 2 },
  { name: "Security Guard", email: "guard@estate.com", password: "Guard@123", roleID: 3 },
];

for (const user of passwords) {
  const hash = await bcrypt.hash(user.password, 10);
  console.log(`${user.name} | ${user.email} | ${hash}`);
}
