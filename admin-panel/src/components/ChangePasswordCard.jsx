import { useState } from "react";
import { changePassword } from "../api";

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600";

export default function ChangePasswordCard({ password, onChanged, onCancel, onUnauthorized }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (newPassword.length < 8) return setError("New password must be at least 8 characters.");
    if (newPassword !== confirm) return setError("The two passwords don't match.");

    setSaving(true);
    setError("");
    try {
      await changePassword(password, newPassword);
      onChanged(newPassword);
    } catch (err) {
      if (err.status === 401) return onUnauthorized();
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold">Change password</h2>
      <p className="mt-1 text-sm text-slate-600">At least 8 characters, no spaces.</p>

      <label className="mt-4 block text-sm font-medium">
        New password
        <input
          type="password"
          autoFocus
          autoComplete="new-password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="mt-3 block text-sm font-medium">
        Confirm new password
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={inputClass}
        />
      </label>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          disabled={saving}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
