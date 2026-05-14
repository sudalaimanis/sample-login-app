import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { JWT_SECRET, requireAuth } from "../middleware/auth.js";

const router = Router();
const SALT_ROUNDS = 10;
const JWT_EXPIRES = "7d";

function mapDbError(err) {
  if (err.code === "42P01") {
    return {
      status: 503,
      body: {
        error:
          'Table "users" is missing. Create it by running db/init.sql against the database in DATABASE_URL.',
      },
    };
  }
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    return {
      status: 503,
      body: {
        error:
          "Cannot connect to PostgreSQL. Check DATABASE_URL and that Postgres is running.",
      },
    };
  }
  if (err.code === "28P01" || err.code === "3D000") {
    return {
      status: 503,
      body: {
        error: "PostgreSQL rejected the connection (wrong user, password, or database name).",
      },
    };
  }
  return null;
}

function signToken(user) {
  return jwt.sign(
    { email: user.email },
    JWT_SECRET,
    { subject: String(user.id), expiresIn: JWT_EXPIRES }
  );
}

router.post("/register", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, created_at`,
      [email, password_hash]
    );
    const user = result.rows[0];
    const token = signToken(user);
    return res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    const mapped = mapDbError(err);
    if (mapped) {
      console.error(err);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error(err);
    const dev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      error: "Registration failed",
      ...(dev && { detail: err.message }),
    });
  }
});

router.post("/login", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const result = await query(
      `SELECT id, email, password_hash FROM users WHERE email = $1`,
      [email]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = signToken({ id: row.id, email: row.email });
    return res.json({ token, user: { id: row.id, email: row.email } });
  } catch (err) {
    const mapped = mapDbError(err);
    if (mapped) {
      console.error(err);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error(err);
    const dev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      error: "Login failed",
      ...(dev && { detail: err.message }),
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user });
  } catch (err) {
    const mapped = mapDbError(err);
    if (mapped) {
      console.error(err);
      return res.status(mapped.status).json(mapped.body);
    }
    console.error(err);
    const dev = process.env.NODE_ENV !== "production";
    return res.status(500).json({
      error: "Failed to load profile",
      ...(dev && { detail: err.message }),
    });
  }
});

export default router;
