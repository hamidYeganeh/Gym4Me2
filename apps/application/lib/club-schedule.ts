// Sample schedule shared by the detail preview and the full slot picker.
export const clubSlots = [
  { value: "12:30", end: "13:30", available: true, extras: ["ball"] as const },
  { value: "13:45", end: "14:45", available: false, extras: [] },
  { value: "15:00", end: "16:00", available: true, extras: [] },
];

export function getTehranDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function getSlotDates(today: string, count: number) {
  if (!today) return [];
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}
