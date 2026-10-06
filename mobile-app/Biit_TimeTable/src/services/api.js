import axios from 'axios';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../config';

// Network calls only. Saving for offline use lives in timetable/TimetableContext.jsx.
const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

// One section's week: { updatedAt, version, fileName, section, days: { Monday: [slots], ... }, etag }.
// Pass the etag of the copy you already have: if the timetable hasn't changed, the server
// answers "304 Not Modified" with no body and this returns null — a tiny, cheap request.
export async function fetchWeek(section, etag) {
  const res = await api.get('', {
    params: { section, view: 'week' },
    headers: etag ? { 'If-None-Match': etag } : undefined,
    validateStatus: status => (status >= 200 && status < 300) || status === 304,
  });
  if (res.status === 304) return null;
  return { ...res.data, etag: res.headers.etag ?? null };
}

// All section names in the current timetable
export async function fetchSections() {
  const { data } = await api.get('/sections');
  return data.sections ?? [];
}

// The server answered, but with an error (e.g. the section no longer exists).
// Anything else (no internet, timeout, server down) means we just couldn't reach it.
export const isServerRejection = err => !!err?.response && err.response.status < 500;

// A message the user can act on
export const errorMessage = err =>
  err?.response?.data?.error ||
  (err?.response
    ? `Server error (${err.response.status}). Please try again later.`
    : "Can't reach the server. Check your internet connection.");
