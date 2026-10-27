const TIME_ZONE = 'America/Sao_Paulo'
const DAY_MS = 86_400_000

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Calendar day (YYYY-MM-DD) of an instant in Brasília time. */
export function saoPauloDay(instant: Date): string {
  return formatter.format(instant)
}

/** Shifts a YYYY-MM-DD day by whole days. */
export function addDays(day: string, days: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}
