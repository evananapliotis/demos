// node --experimental-strip-types scripts/time-test.mjs → checks the Europe/London helpers across both 2026 clock changes.
import { zonedToUtc, offsetAt, londonParts, addDays, fmtTime, fmtDay } from '../src/lib/time.ts';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'ok ' : 'FAIL'} ${msg}`); if (!cond) failures++; };
const cases = [
  ['2026-10-24', '09:00', '2026-10-24T08:00:00.000Z', 'BST, the day before the clocks go back'],
  ['2026-10-25', '00:30', '2026-10-24T23:30:00.000Z', 'BST, small hours of change day'],
  ['2026-10-25', '09:00', '2026-10-25T09:00:00.000Z', 'GMT, after the clocks go back at 02:00'],
  ['2026-10-25', '16:00', '2026-10-25T16:00:00.000Z', 'GMT, Sunday closing time on change day'],
  ['2026-03-28', '09:00', '2026-03-28T09:00:00.000Z', 'GMT, the day before the clocks go forward'],
  ['2026-03-29', '09:00', '2026-03-29T08:00:00.000Z', 'BST, after the clocks go forward at 01:00'],
  ['2026-07-01', '18:15', '2026-07-01T17:15:00.000Z', 'BST, a Thursday close'],
  ['2026-01-05', '08:30', '2026-01-05T08:30:00.000Z', 'GMT, a winter opening'],
];
for (const [date, hhmm, expect, why] of cases) {
  const got = zonedToUtc(date, hhmm).toISOString();
  ok(got === expect, `${date} ${hhmm} London → ${got} (${why})`);
  const back = londonParts(new Date(expect));
  ok(back.date === date && back.hhmm === hhmm, `   and back: ${back.date} ${back.hhmm}`);
}
ok(offsetAt(new Date('2026-07-01T12:00:00Z')) === 60 && offsetAt(new Date('2026-01-01T12:00:00Z')) === 0, 'offset is 60 in summer, 0 in winter');
ok(addDays('2026-02-28', 1) === '2026-03-01' && addDays('2026-12-31', 1) === '2027-01-01', 'addDays crosses month and year ends');
ok(fmtTime('09:00') === '9am' && fmtTime('18:15') === '6:15pm' && fmtTime('12:00') === '12pm' && fmtTime('00:30') === '12:30am', 'time formatting');
ok(fmtDay('2026-09-12') === 'Sat 12 Sept' || fmtDay('2026-09-12') === 'Sat 12 Sep', `day formatting (${fmtDay('2026-09-12')})`);
// Slot grid across the change day: 09:00–16:00 on 2026-10-25 must be 7 real hours, not 8
const start = zonedToUtc('2026-10-25', '09:00'), end = zonedToUtc('2026-10-25', '16:00');
ok((end - start) / 3600000 === 7, 'Sunday 25 Oct opening span is 7 hours of real time');
console.log(failures ? `\n${failures} FAILED` : '\nTIME TESTS OK');
process.exit(failures ? 1 : 0);
