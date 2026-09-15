import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, ROLES } from "./models";

// Seed data is deterministic and idempotent: rerunning it updates the known demo accounts
// instead of creating duplicates, which is useful for evaluator setup and local demos.
const accounts = ROLES.map((role) => ({
  role,
  name: `${role} Executive`,
  email: `${role.toLowerCase()}@lms.demo`,
  password: "Password@123",
}));
(async () => {
  // Use the same environment configuration as the running API.
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms",
  );
  for (const account of accounts)
    // Upsert gives every evaluator a known login without overwriting unrelated users.
    await User.findOneAndUpdate(
      { email: account.email },
      { ...account, password: await bcrypt.hash(account.password, 12) },
      { upsert: true, new: true },
    );
  console.table(
    accounts.map(({ role, email, password }) => ({ role, email, password })),
  );
  await mongoose.disconnect();
})();
