export interface Holiday {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: 'HOLIDAY' | 'LONG_WEEKEND';
}

export const indianHolidays2026: Holiday[] = [
  {
    name: 'Mahatma Gandhi Jayanti',
    startDate: '2026-10-02',
    endDate: '2026-10-04',
    type: 'HOLIDAY',
  },
  { name: 'Dussehra', startDate: '2026-10-17', endDate: '2026-10-20', type: 'HOLIDAY' },
  { name: 'Maharishi Valmiki', startDate: '2026-10-24', endDate: '2026-10-26', type: 'HOLIDAY' },
  { name: 'Karaka Chaturthi', startDate: '2026-10-29', endDate: '2026-11-01', type: 'HOLIDAY' },
  { name: 'Diwali', startDate: '2026-11-08', endDate: '2026-11-09', type: 'HOLIDAY' },
  { name: 'Bhai Duj', startDate: '2026-11-11', endDate: '2026-11-15', type: 'HOLIDAY' },
  { name: 'Chhat Puja', startDate: '2026-11-15', endDate: '2026-11-16', type: 'HOLIDAY' },
  { name: 'Guru Nanak Jayanti', startDate: '2026-11-21', endDate: '2026-11-24', type: 'HOLIDAY' },
];

export const getHolidayForDate = (date: Date): Holiday | undefined => {
  if (!date) return undefined;
  const dateStr = date.toISOString().split('T')[0];
  return indianHolidays2026.find((h) => dateStr >= h.startDate && dateStr <= h.endDate);
};

export const getPricesForDate = (date: Date): number | null => {
  if (!date) return null;
  // Mock prices: Random price between 3000 and 8000 based on day of month
  const day = date.getDate();
  const basePrice = 4500;
  if (day % 7 === 0 || day % 7 === 6) return basePrice + 1200; // Weekends more expensive
  if (getHolidayForDate(date)) return basePrice + 2500; // Holidays most expensive
  return basePrice + (day % 5) * 200;
};
