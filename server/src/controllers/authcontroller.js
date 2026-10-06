const fs = require("fs");
const path = require("path");
const DATA_DIR = require("../dataDir");

// A password changed from the admin panel is saved next to the timetable, so it survives
// restarts (on Render only the data disk is kept). It takes priority over ADMIN_PASSWORD
// from .env / the Render dashboard. Forgot it? Delete this file and restart.
const PASSWORD_FILE = path.join(DATA_DIR, "admin.json");

// called once at startup (server.js)
exports.loadSavedPassword = () => {
  try {
    const { password } = JSON.parse(fs.readFileSync(PASSWORD_FILE, "utf-8"));
    if (password) process.env.ADMIN_PASSWORD = password;
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Could not read saved admin password:", err.message);
  }
};

// requireAdmin has already checked the password by the time these run
exports.login = (req, res) => res.json({ ok: true });

exports.changePassword = async (req, res) => {
  const { newPassword } = req.body || {};

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  if (/\s/.test(newPassword)) {
    return res.status(400).json({ error: "Password can't contain spaces" });
  }

  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    await fs.promises.writeFile(PASSWORD_FILE, JSON.stringify({ password: newPassword }));
    process.env.ADMIN_PASSWORD = newPassword; // takes effect now, no restart needed
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the new password" });
  }
};
