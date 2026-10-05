const crypto = require("crypto");

// Hash both sides so timingSafeEqual gets equal-length buffers and the
// comparison time doesn't leak how much of the password was right.
const hash = s => crypto.createHash("sha256").update(String(s)).digest();

function isAdminPassword(password) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !password) return false;
  return crypto.timingSafeEqual(hash(password), hash(expected));
}

function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD is not set on the server" });
  }

  if (!isAdminPassword(req.get("x-admin-password"))) {
    return res.status(401).json({ error: "Wrong password" });
  }

  next();
}

module.exports = { requireAdmin };
