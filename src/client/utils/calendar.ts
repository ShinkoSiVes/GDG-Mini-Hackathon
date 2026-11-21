import { PlannedBlock } from '../../shared/types.js';

function formatICSDate(dateStr: string, timeStr: string): string {
  // dateStr is YYYY-MM-DD, timeStr is HH:mm
  const [year, month, day] = dateStr.split('-');
  const [hour, minute] = timeStr.split(':');
  return `${year}${month}${day}T${hour}${minute}00`;
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates an .ics iCalendar file string with Asia/Manila timezone and 10-minute VALARM
 */
export function generateICS(blocks: PlannedBlock[], dateStr: string = getTodayDateString()): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const events = blocks.map((block) => {
    const dtStart = formatICSDate(dateStr, block.start);
    const dtEnd = formatICSDate(dateStr, block.end);
    const uid = `singit-${block.habitId}-${Date.now()}@singit.app`;
    const cleanTitle = block.title.replace(/[,;]/g, ' ');
    const cleanReason = block.reason.replace(/[,;\n]/g, ' ');

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART;TZID=Asia/Manila:${dtStart}`,
      `DTEND;TZID=Asia/Manila:${dtEnd}`,
      `SUMMARY:${cleanTitle} [Singit Habit]`,
      `DESCRIPTION:${cleanReason} | Target: ${block.target} ${block.unit || ''}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT10M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Singit habit starts in 10 minutes.',
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Singit//Habit Squeezer PH//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:Asia/Manila',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Manila',
    'X-LIC-LOCATION:Asia/Manila',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:PHT',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download of the .ics calendar file
 */
export function downloadICS(blocks: PlannedBlock[]): void {
  const icsData = generateICS(blocks);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `singit-habits-${getTodayDateString()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Creates a prefilled "Add to Google Calendar" link
 */
export function getGoogleCalendarUrl(block: PlannedBlock, dateStr: string = getTodayDateString()): string {
  const dtStart = formatICSDate(dateStr, block.start);
  const dtEnd = formatICSDate(dateStr, block.end);
  const text = encodeURIComponent(`${block.title} [Singit]`);
  const details = encodeURIComponent(
    `${block.reason}\n\nTarget: ${block.target} ${block.unit || ''}\nSqueezed in via Singit habit planner.`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dtStart}/${dtEnd}&details=${details}&ctz=Asia/Manila`;
}
