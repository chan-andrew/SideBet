import { Position, Side, OddsSplit } from './types'

// Simple cn utility without clsx dependency - just join strings
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(0)}`
}

export function formatDeadline(deadline: string): string {
  const now = new Date()
  const end = new Date(deadline)
  const diff = end.getTime() - now.getTime()

  if (diff < 0) return 'Ended'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatDeadlineFull(deadline: string): string {
  return new Date(deadline).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function calcOdds(positions: Position[]): OddsSplit {
  const yesAmount = positions
    .filter((p) => p.side === 'yes')
    .reduce((sum, p) => sum + p.amount, 0)
  const noAmount = positions
    .filter((p) => p.side === 'no')
    .reduce((sum, p) => sum + p.amount, 0)
  const overAmount = positions
    .filter((p) => p.side === 'over')
    .reduce((sum, p) => sum + p.amount, 0)
  const underAmount = positions
    .filter((p) => p.side === 'under')
    .reduce((sum, p) => sum + p.amount, 0)

  const yesNoTotal = yesAmount + noAmount
  const overUnderTotal = overAmount + underAmount

  return {
    yesAmount,
    noAmount,
    yesPct: yesNoTotal > 0 ? Math.round((yesAmount / yesNoTotal) * 100) : 50,
    noPct: yesNoTotal > 0 ? Math.round((noAmount / yesNoTotal) * 100) : 50,
    overAmount,
    underAmount,
    overPct:
      overUnderTotal > 0
        ? Math.round((overAmount / overUnderTotal) * 100)
        : 50,
    underPct:
      overUnderTotal > 0
        ? Math.round((underAmount / overUnderTotal) * 100)
        : 50,
  }
}

export function getSideLabel(side: Side, betType: string): string {
  if (betType === 'over_under') {
    return side === 'over' ? 'OVER' : 'UNDER'
  }
  return side === 'yes' ? 'YES' : 'NO'
}

export function formatPhone(phone: string): string {
  // Mask middle digits: +1 (***) ***-1234
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `+${digits[0]} (***) ***-${digits.slice(-4)}`
  }
  return `***-${phone.slice(-4)}`
}

export function calcSettlement(
  positions: Position[],
  outcome: Side
): { userId: string; net: number }[] {
  const winners = positions.filter((p) => p.side === outcome)
  const losers = positions.filter((p) => p.side !== outcome)

  const totalLoser = losers.reduce((sum, p) => sum + p.amount, 0)
  const totalWinner = winners.reduce((sum, p) => sum + p.amount, 0)

  return positions.map((p) => {
    if (p.side === outcome) {
      // Winner gets proportional share of loser pool
      const winnings =
        totalWinner > 0 ? (p.amount / totalWinner) * totalLoser : 0
      return { userId: p.user_id, net: winnings }
    } else {
      return { userId: p.user_id, net: -p.amount }
    }
  })
}
