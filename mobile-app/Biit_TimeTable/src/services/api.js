import axios from 'axios';

import { saveCachedWeek, getCachedWeek } from '../storage/timetableCache';

const api = axios.create({
    baseURL: "http://192.168.1.13:5000/api/timetable",
    timeout:10000,
});

// Download a section's week from the server and save it for offline use.
// Throws if there is no internet — used when picking a section, which needs the network.
export async function downloadWeek(section) {
  const { data } = await api.get("", { params: { section, view: "week" } });
  await saveCachedWeek(section, data);
  return data;
}

// Today and Schedule screens: fresh data when online, the saved copy when offline.
export async function getWeek(section) {
  try {
    const data = await downloadWeek(section);
    return { ...data, fromCache: false };
  } catch (err) {
    // A 4xx answer (e.g. the section was removed in a new upload) means the saved copy
    // is out of date, so show the error instead of hiding the change. No answer at all
    // (offline, server down) or a 5xx falls back to the saved copy.
    if (err.response && err.response.status < 500) throw err;
    const cached = await getCachedWeek(section);
    if (cached) return { ...cached, fromCache: true };
    throw err;  // no network AND no cache — nothing we can show
  }
}

export async function getSections() {
  const { data } = await api.get("/sections");
  return data.sections;
}
