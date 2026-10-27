/**
 * Official campaign periods (TSE calendar): first day electoral propaganda is allowed → day of the
 * last round. Dates checked on 26/10/2026:
 *
 * - 2014: propaganda from 6 July (Lei 9.504/1997, art. 36, "após o dia 5 de julho"; Res. TSE
 *   23.404/2014, art. 2º); rounds on 5 and 26 October.
 * - 2016, 2018, 2022, 2024, 2026: propaganda from 16 August (art. 36 as amended by Lei
 *   13.165/2015, "após o dia 15 de agosto"). Rounds: 2016 → 2 and 30 October; 2018 → 7 and 28
 *   October; 2022 → 2 and 30 October; 2024 → 6 and 27 October; 2026 → 4 and 25 October (Res. TSE
 *   23.760).
 * - 2020: postponed by EC 107/2020 because of the pandemic: propaganda from 27 September (art. 1º,
 *   §1º, IV), rounds on 15 and 29 November. Macapá's delayed vote (December) is not covered.
 */
export interface ElectionPeriod {
  readonly year: number
  /** YYYY-MM-DD, inclusive. */
  readonly campaignStart: string
  /** YYYY-MM-DD of the last round, inclusive. */
  readonly campaignEnd: string
  /** YYYY-MM-DD of each round. */
  readonly rounds: readonly string[]
}

export const ELECTIONS: readonly ElectionPeriod[] = [
  {
    year: 2014,
    campaignStart: '2014-07-06',
    campaignEnd: '2014-10-26',
    rounds: ['2014-10-05', '2014-10-26'],
  },
  {
    year: 2016,
    campaignStart: '2016-08-16',
    campaignEnd: '2016-10-30',
    rounds: ['2016-10-02', '2016-10-30'],
  },
  {
    year: 2018,
    campaignStart: '2018-08-16',
    campaignEnd: '2018-10-28',
    rounds: ['2018-10-07', '2018-10-28'],
  },
  {
    year: 2020,
    campaignStart: '2020-09-27',
    campaignEnd: '2020-11-29',
    rounds: ['2020-11-15', '2020-11-29'],
  },
  {
    year: 2022,
    campaignStart: '2022-08-16',
    campaignEnd: '2022-10-30',
    rounds: ['2022-10-02', '2022-10-30'],
  },
  {
    year: 2024,
    campaignStart: '2024-08-16',
    campaignEnd: '2024-10-27',
    rounds: ['2024-10-06', '2024-10-27'],
  },
  {
    year: 2026,
    campaignStart: '2026-08-16',
    campaignEnd: '2026-10-25',
    rounds: ['2026-10-04', '2026-10-25'],
  },
]

export const ELECTION_YEARS: readonly number[] = ELECTIONS.map((election) => election.year)

export function findElection(year: number): ElectionPeriod | undefined {
  return ELECTIONS.find((election) => election.year === year)
}

/** Whether an ISO date (YYYY-MM-DD, or a longer ISO string) falls inside the campaign. */
export function isInCampaign(date: string | null, election: ElectionPeriod): boolean {
  if (date === null) return false
  const day = date.slice(0, 10)
  return day >= election.campaignStart && day <= election.campaignEnd
}

export function electionForDate(date: string | null): ElectionPeriod | undefined {
  return ELECTIONS.find((election) => isInCampaign(date, election))
}
