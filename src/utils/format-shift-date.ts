/**
 * Format date string dari backend (ISO / "YYYY-MM-DD") ke format Indonesia.
 *
 * Input : "2026-04-01T00:00:00Z"  atau  "2026-04-01"
 * Output: "Rabu, 01 Apr 2026"
 *
 * Format lengkap dengan nama hari:
 *   fShiftDate("2026-04-01")          → "Rabu, 01 Apr 2026"
 *
 * Format singkat tanpa hari:
 *   fShiftDate("2026-04-01", false)   → "01 Apr 2026"
 */

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function fShiftDate(dateStr: string, withDay = true): string {
  if (!dateStr) return '-';

  // Ambil hanya bagian "YYYY-MM-DD" agar tidak terpengaruh timezone ISO
  const raw = dateStr.slice(0, 10); // "2026-04-01"
  const [year, month, day] = raw.split('-').map(Number);

  if (!year || !month || !day) return dateStr;

  // Buat Date tanpa konversi timezone: pukul 12 siang lokal aman dari UTC drift
  const date = new Date(year, month - 1, day, 12, 0, 0);

  const d = String(day).padStart(2, '0');
  const b = BULAN_SINGKAT[month - 1] ?? '';

  if (withDay) {
    const hari = HARI[date.getDay()];
    return `${hari}, ${d} ${b} ${year}`;
  }

  return `${d} ${b} ${year}`;
}
