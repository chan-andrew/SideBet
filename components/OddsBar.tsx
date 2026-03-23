'use client'

import { Position, BetType } from '@/lib/types'
import { calcOdds } from '@/lib/utils'

interface OddsBarProps {
  positions: Position[]
  betType: BetType
  size?: 'sm' | 'md' | 'lg'
}

export default function OddsBar({ positions, betType, size = 'md' }: OddsBarProps) {
  const odds = calcOdds(positions)
  const isYesNo = betType === 'yes_no'

  const leftPct = isYesNo ? odds.yesPct : odds.overPct
  const rightPct = isYesNo ? odds.noPct : odds.underPct
  const leftLabel = isYesNo ? 'YES' : 'OVER'
  const rightLabel = isYesNo ? 'NO' : 'UNDER'
  const leftAmount = isYesNo ? odds.yesAmount : odds.overAmount
  const rightAmount = isYesNo ? odds.noAmount : odds.underAmount

  const barH = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3'
  const textSz = size === 'lg' ? 'text-sm' : 'text-xs'

  // Leading side gets purple, trailing gets dark gray
  const leftColor = leftPct >= rightPct ? '#a100f2' : '#222'
  const rightColor = rightPct > leftPct ? '#a100f2' : '#222'

  return (
    <div className="w-full">
      {/* Bar */}
      <div className={`w-full ${barH} flex`}>
        <div
          className="transition-all duration-500"
          style={{ width: `${leftPct}%`, backgroundColor: leftColor }}
        />
        <div
          className="transition-all duration-500"
          style={{ width: `${rightPct}%`, backgroundColor: rightColor }}
        />
      </div>

      {/* Labels */}
      <div className={`flex justify-between mt-1.5 ${textSz} font-mono`}>
        <div className="flex items-center gap-1.5">
          <span
            className="font-bold tabular-nums"
            style={{ color: leftColor === '#a100f2' ? '#a100f2' : '#444' }}
          >
            {leftPct}%
          </span>
          <span className="text-[#444] text-[10px] tracking-widest uppercase">{leftLabel}</span>
          {size === 'lg' && leftAmount > 0 && (
            <span className="text-[#333] ml-1">${leftAmount}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {size === 'lg' && rightAmount > 0 && (
            <span className="text-[#333] mr-1">${rightAmount}</span>
          )}
          <span className="text-[#444] text-[10px] tracking-widest uppercase">{rightLabel}</span>
          <span
            className="font-bold tabular-nums"
            style={{ color: rightColor === '#a100f2' ? '#a100f2' : '#444' }}
          >
            {rightPct}%
          </span>
        </div>
      </div>
    </div>
  )
}
