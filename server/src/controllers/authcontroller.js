const store = require("../store");

// A password changed from the admin panel is saved with the timetable ("admin" in the
// store), so it survives restarts. It takes priority over ADMIN_PASSWORD from .env /
// the Render dashboard. Forgot it? Delete data/admin.json (or the "admin" document
// in MongoDB) and restart.

// called once at startup (server.js)
exports.loadSavedPassword = async () => {
  try {
    const saved = await store.read("admin");
    if (saved?.password) process.env.ADMIN_PASSWORD = saved.password;
  } catch (err) {
    console.error("Could not read saved admin password:", err.message);
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
    await store.write("admin", { password: newPassword });
    process.env.ADMIN_PASSWORD = newPassword; // takes effect now, no restart needed
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the new password" });
  }
};
