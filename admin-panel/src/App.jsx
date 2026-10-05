import { useState } from "react";
import Header from "./components/Header";
import LoginCard from "./components/LoginCard";
import UploadCard from "./components/UploadCard";
import ChangePasswordCard from "./components/ChangePasswordCard";

// Password is kept only for this browser tab; closing the tab logs out.
const KEY = "biit-admin-password";
const readSaved = () => {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};
const save = value => {
  try {
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {
    // storage blocked: stay logged in until the page reloads
  }
};

export default function App() {
  const [password, setPassword] = useState(readSaved);
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState("upload"); // upload | password
  const [changed, setChanged] = useState(false);

  function handleLogin(pw) {
    save(pw);
    setNotice("");
    setPassword(pw);
  }

  function logout(message = "") {
    save("");
    setNotice(message);
    setPassword("");
    setPage("upload");
    setChanged(false);
  }

  function handlePasswordChanged(pw) {
    handleLogin(pw); // stay logged in with the new password
    setPage("upload");
    setChanged(true);
  }

  const expired = () => logout("Your session expired. Please log in again.");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Header
        onLogout={password ? () => logout() : undefined}
        onChangePassword={() => {
          setChanged(false);
          setPage("password");
        }}
      />

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {!password ? (
          <LoginCard onLogin={handleLogin} notice={notice} />
        ) : page === "password" ? (
          <ChangePasswordCard
            password={password}
            onChanged={handlePasswordChanged}
            onCancel={() => setPage("upload")}
            onUnauthorized={expired}
          />
        ) : (
          <>
            <UploadCard password={password} onUnauthorized={expired} />
            {changed && (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                Password changed. Use the new password next time you log in.
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
