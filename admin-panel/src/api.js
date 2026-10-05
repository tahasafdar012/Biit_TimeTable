// Server address: set VITE_API_URL in admin-panel/.env.production on EC2; defaults to local dev
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API = `${BASE}/api/timetable`;

// fetch wrapper: throws an Error with the server's message (and HTTP status) on failure
async function request(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error("Can't reach the server. Start it with `yarn start` in the server folder.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const login = password =>
  request(`${API}/login`, { method: "POST", headers: { "x-admin-password": password } });

export const changePassword = (password, newPassword) =>
  request(`${API}/password`, {
    method: "POST",
    headers: { "x-admin-password": password, "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword }),
  });

export function uploadPdf(file, password) {
  const form = new FormData();
  form.append("file", file); // "file" must match upload.single("file") on the server
  return request(`${API}/upload`, {
    method: "POST",
    headers: { "x-admin-password": password },
    body: form,
  });
}
