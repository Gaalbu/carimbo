/** Years offered by the election selector (docs/PLANO.md §4.3). */
export const ELECTION_YEARS: readonly number[] = [2026, 2024, 2022, 2020, 2018, 2016, 2014]

export function isElectionYear(value: number): boolean {
  return ELECTION_YEARS.includes(value)
}
