'use client'

import Link from 'next/link'
import { Line, Position, Side } from '@/lib/types'
import { formatDeadline, formatCurrency, calcOdds } from '@/lib/utils'
import OddsBar from './OddsBar'

interface LineCardProps {
  line: Line
  positions: Position[]
  currentUserId?: string
}

export default function LineCard({ line, positions, currentUserId }: LineCardProps) {
  const myPos = currentUserId ? positions.find((p) => p.user_id === currentUserId) : null
  const odds = calcOdds(positions)
  const isYesNo = line.bet_type === 'yes_no'
  const totalPool = isYesNo ? odds.yesAmount + odds.noAmount : odds.overAmount + odds.underAmount
  const isExpired = new Date(line.deadline) < new Date()
  const isResolved = line.status === 'resolved'

  function sideLabel(s: Side) {
    return s.toUpperCase()
  }

  return (
    <Link href={`/line/${line.id}`}>
      <div className="bg-[#0f0f0f] border border-[#1e1e1e] p-4 hover:border-[#2a2a2a] active:bg-[#151515] transition-colors duration-75 cursor-pointer rounded-lg">
        {/* Status + question */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <p className="text-white font-semibold text-[15px] leading-snug flex-1">
            {line.question}
          </p>
          <div className="shrink-0 mt-0.5">
            {isResolved ? (
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#a100f2]">
                SETTLED
              </span>
            ) : isExpired ? (
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#444]">
                ENDED
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#a100f2]">
                ● LIVE
              </span>
            )}
          </div>
        </div>

        {/* Over/under number */}
        {!isYesNo && line.over_under_number != null && (
          <p className="text-[11px] font-mono text-[#444] mb-2">
            LINE <span className="text-[#a100f2] font-bold">{line.over_under_number}</span>
          </p>
        )}

        {/* Odds bar */}
        <div className="mb-3">
          <OddsBar positions={positions} betType={line.bet_type} size="sm" />
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#444]">
          <div className="flex items-center gap-3">
            <span>{formatCurrency(line.wager_amount)} wager</span>
            {totalPool > 0 && (
              <span className="text-[#333]">{formatCurrency(totalPool)} pool</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {myPos && (
              <span className="text-[#a100f2] font-bold">
                {sideLabel(myPos.side)}
              </span>
            )}
            {!isResolved && (
              <span>{isExpired ? 'ended' : formatDeadline(line.deadline)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
