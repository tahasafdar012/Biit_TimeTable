// Address of the BIIT TimeTable server. Use your PC's Wi-Fi IP (run `ipconfig`) while developing.
export const API_BASE_URL = 'http://192.168.1.13:5000/api/timetable';

// How long to wait for the server before giving up (the saved timetable is shown meanwhile)
export const REQUEST_TIMEOUT_MS = 10 * 1000;

// While the app is open, check the server for a newly uploaded timetable this often
export const UPDATE_CHECK_INTERVAL_MS = 2 * 60 * 1000;
