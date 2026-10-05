const fs = require("fs/promises");
const path = require("path");

const ENV_FILE = path.join(__dirname, "../../.env");

// requireAdmin has already checked the password by the time these run
exports.login = (req, res) => res.json({ ok: true });

exports.changePassword = async (req, res) => {
  const { newPassword } = req.body || {};

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  // keep the .env line simple: these characters would need quoting/escaping
  if (/[\s#"'`\\]/.test(newPassword)) {
    return res.status(400).json({ error: "Password can't contain spaces, #, quotes or \\" });
  }

  try {
    let text = "";
    try {
      text = await fs.readFile(ENV_FILE, "utf-8");
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    const line = `ADMIN_PASSWORD=${newPassword}`;
    const pattern = /^ADMIN_PASSWORD=.*$/m;
    text = pattern.test(text)
      ? text.replace(pattern, () => line)
      : `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;

    await fs.writeFile(ENV_FILE, text);
    process.env.ADMIN_PASSWORD = newPassword; // takes effect now, no restart needed
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save the new password" });
  }
};
