/* ──────────────────────────────────────────────────────────────
 *  server.ts — Express application bootstrap
 *
 *  Initialises the Express server with CORS, JSON body parsing,
 *  route mounting, and a MongoDB connection via Mongoose. The
 *  API starts only after the database connection is confirmed.
 * ────────────────────────────────────────────────────────────── */

import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { authRouter } from "./routes/authRoutes";
import { loanRouter } from "./routes/loanRoutes";

// Express is intentionally kept as the transport layer. Business rules live in route handlers
// and the database models so they remain enforceable even when the frontend is bypassed.
const app = express();

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : "http://localhost:3000";
app.use(cors({
  origin: [clientUrl, "http://localhost:3000"],
  credentials: true,
}));

// JSON is limited to 2 MB because salary slips are uploaded through Multer, not JSON.
app.use(express.json({ limit: "2mb" }));

// These routes make local troubleshooting explicit when someone opens the API port directly.
app.get("/", (_, res) =>
  res.json({
    message: "Lendwise API is running",
    frontend: "http://localhost:3000",
    health: "/api/health",
  }),
);
app.get("/api/health", (_, res) => res.json({ ok: true, service: "lms-api" }));

// Routers group authentication and loan lifecycle endpoints by bounded context.
app.use("/api/auth", authRouter);
app.use("/api/loans", loanRouter);
const port = Number(process.env.PORT || 4000);

// The API starts only after MongoDB is connected so requests cannot arrive with an unready database.
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/lms")
  .then(() => app.listen(port, () => console.log(`LMS API running on ${port}`)))
  .catch((error) => {
    console.error("MongoDB connection failed", error);
    process.exit(1);
  });
