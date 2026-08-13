import { Router } from "express";
import User from "../models/User.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { dbIsConnected } from "../config/db.js";

const router = Router();

router.post("/signup", async (req, res) => {
  if (!dbIsConnected()) {
    return res.status(503).json({
      error: "Accounts require MongoDB to be configured (set MONGODB_URI). You can still run analyses in guest mode.",
    });
  }
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, and password are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: "An account with that email already exists" });

  const user = new User({ name, email });
  await user.setPassword(password);
  await user.save();

  res.status(201).json({ token: signToken(user), user: user.toSafeJSON() });
});

router.post("/login", async (req, res) => {
  if (!dbIsConnected()) {
    return res.status(503).json({ error: "Accounts require MongoDB to be configured (set MONGODB_URI)." });
  }
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || "").toLowerCase() });
  if (!user || !(await user.checkPassword(password || ""))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  res.json({ token: signToken(user), user: user.toSafeJSON() });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: user.toSafeJSON() });
});

export default router;
