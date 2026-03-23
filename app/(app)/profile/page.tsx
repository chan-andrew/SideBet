import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import SignOutButton from '@/components/SignOutButton'
import { Line, Position } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('sidebet_uid')?.value
  if (!userId) redirect('/onboarding')

  const supabase = createClient()
  const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single()
  if (!profile) redirect('/onboarding')

  const { data: posData } = await supabase.from('positions').select('*').eq('user_id', userId)
  const positions = (posData ?? []) as Position[]
  const posLineIds = positions.map((p) => p.line_id)

  const { data: resolvedData } = posLineIds.length
    ? await supabase.from('lines').select('*').in('id', posLineIds).eq('status', 'resolved')
    : { data: [] }
  const resolvedLines = (resolvedData ?? []) as Line[]

  let wins = 0, losses = 0, totalWon = 0, totalLost = 0
  resolvedLines.forEach((line) => {
    const pos = positions.find((p) => p.line_id === line.id)
    if (!pos || !line.outcome) return
    if (pos.side === line.outcome) { wins++; totalWon += pos.amount }
    else { losses++; totalLost += pos.amount }
  })

  const totalBets = wins + losses
  const winRate = totalBets > 0 ? (wins / totalBets) * 100 : 0
  const netPnl = totalWon - totalLost
  const openPositions = positions.filter((p) =>
    !resolvedLines.find((l) => l.id === p.line_id)
  )

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-5 border-b border-[#1a1a1a]">
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-1">YOUR ACCOUNT</p>
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">{profile.name}</h1>
            <p className="text-[11px] font-mono text-[#444] mt-1">{profile.phone}</p>
          </div>
          <div className="w-12 h-12 bg-[#111] border border-[#1e1e1e] flex items-center justify-center">
            <span className="text-xl font-black text-[#a100f2]">{profile.name[0].toUpperCase()}</span>
          </div>
        </div>
      </header>

      {/* Stats — trading terminal style */}
      <section className="border-b border-[#1a1a1a]">
        <div className="grid grid-cols-2 divide-x divide-y divide-[#1a1a1a]">
          <Stat label="WIN RATE" value={`${winRate.toFixed(1)}%`}
            accent={winRate >= 50} />
          <Stat label="NET P&L"
            value={`${netPnl >= 0 ? '+' : ''}${formatCurrency(netPnl)}`}
            accent={netPnl > 0} />
          <Stat label="RECORD" value={`${wins} / ${losses}`} />
          <Stat label="TOTAL BETS" value={String(totalBets)} />
        </div>
      </section>

      {/* Open positions */}
      <section className="px-4 pt-5 pb-3">
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-1">
          OPEN POSITIONS
        </p>
        <p className="text-[11px] font-mono text-[#333]">
          {openPositions.length} active
        </p>
      </section>

      <div className="h-px bg-[#1a1a1a]" />

      {/* History */}
      {resolvedLines.length > 0 && (
        <section className="px-4 pt-5">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-3">HISTORY</p>
          <div className="border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {resolvedLines.slice(0, 12).map((line) => {
              const pos = positions.find((p) => p.line_id === line.id)
              if (!pos) return null
              const won = pos.side === line.outcome
              return (
                <Link key={line.id} href={`/line/${line.id}`}>
                  <div className="flex items-center bg-[#0f0f0f] hover:bg-[#111] transition-colors px-3 py-3 gap-3">
                    <div className="w-1 h-8 shrink-0"
                      style={{ backgroundColor: won ? '#a100f2' : '#1e1e1e' }} />
                    <p className="text-sm text-[#888] flex-1 truncate">{line.question}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono font-bold ${won ? 'text-white' : 'text-[#444]'}`}>
                        {won ? 'WIN' : 'LOSS'}
                      </span>
                      <span className={`text-[11px] font-mono ${won ? 'text-[#a100f2]' : 'text-[#333]'}`}>
                        {won ? '+' : '−'}{formatCurrency(pos.amount)}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <div className="px-4 pt-8 pb-4">
        <SignOutButton />
      </div>
    </div>
  )
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-4 py-5">
      <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-2">{label}</p>
      <p className={`text-3xl font-black font-mono tabular-nums ${accent ? 'text-[#a100f2]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}
