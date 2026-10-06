// Timetable times are 12-hour without AM/PM ("1:30" = 1:30 PM). Same rule as the server:
// hours before 8 are afternoon. Returns minutes since midnight.
export const toMinutes = time => {
  const [h, m] = String(time).split(':').map(Number);
  return (h < 8 ? h + 12 : h) * 60 + (m || 0);
};

// Minutes since midnight right now
export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

// "Monday", "Tuesday", ... — matches the day keys the server sends
export const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

// "Monday, 6 October"
export const todayLabel = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

// ISO date from the server -> "6 Oct 2026, 10:12 PM" (null if missing/invalid)
export const formatUpdatedAt = iso => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
