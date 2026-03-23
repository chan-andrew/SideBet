export interface User {
  id: string
  name: string
  phone: string
  created_at: string
}

export interface Party {
  id: string
  name: string
  created_by: string
  invite_code: string
  created_at: string
}

export interface PartyMember {
  party_id: string
  user_id: string
  joined_at: string
}

export type BetType = 'yes_no' | 'over_under'
export type LineStatus = 'open' | 'resolved'
export type Side = 'yes' | 'no' | 'over' | 'under'

export interface Line {
  id: string
  question: string
  bet_type: BetType
  over_under_number: number | null
  wager_amount: number
  created_by: string
  party_id: string | null
  status: LineStatus
  outcome: Side | null
  deadline: string
  invite_code: string
  created_at: string
}

export interface Position {
  id: string
  line_id: string
  user_id: string
  side: Side
  amount: number
  created_at: string
}

// Extended types with joins
export interface LineWithPositions extends Line {
  positions: (Position & { user: User })[]
  creator: User
}

export interface PartyWithMembers extends Party {
  members: (PartyMember & { user: User })[]
}

export interface OddsSplit {
  yesPct: number
  noPct: number
  yesAmount: number
  noAmount: number
  overPct: number
  underPct: number
  overAmount: number
  underAmount: number
}
