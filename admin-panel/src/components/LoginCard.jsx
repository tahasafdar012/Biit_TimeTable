import { useState } from "react";
import { login } from "../api";

export default function LoginCard({ onLogin, notice }) {
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!password) return setError("Please enter the password.");
    setChecking(true);
    setError("");
    try {
      await login(password);
      onLogin(password);
    } catch (err) {
      setError(err.message);
      setChecking(false);
    }
  }

  const message = error || notice;

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold">Admin login</h2>

      <label className="mt-4 block text-sm font-medium">
        Password
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600"
        />
      </label>

      {message && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
      )}

      <button
        disabled={checking}
        className="mt-4 w-full rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
      >
        {checking ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
