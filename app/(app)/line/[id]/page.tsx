'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalUser } from '@/lib/user'
import OddsBar from '@/components/OddsBar'
import { Line, Position, User, Side } from '@/lib/types'
import { formatDeadline, formatDeadlineFull, formatCurrency, calcOdds, getSideLabel } from '@/lib/utils'

export default function LineDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const supabase = createClient()

  const [line, setLine] = useState<Line | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null)
  const [myPosition, setMyPosition] = useState<Position | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSide, setSelectedSide] = useState<Side | null>(null)
  const [betLoading, setBetLoading] = useState(false)
  const [betError, setBetError] = useState('')
  const [copied, setCopied] = useState(false)

  const loadData = useCallback(async () => {
    const localUser = getLocalUser()
    if (!localUser) { router.push('/onboarding'); return }
    setCurrentUser(localUser)

    const [lineRes] = await Promise.all([
      supabase.from('lines').select('*').eq('id', id).single(),
    ])
    if (lineRes.error || !lineRes.data) { router.push('/home'); return }

    const lineData = lineRes.data as Line
    setLine(lineData)

    const { data: posData } = await supabase
      .from('positions').select('*').eq('line_id', id).order('created_at', { ascending: true })
    const posArr = (posData ?? []) as Position[]
    setPositions(posArr)

    const myPos = posArr.find((p) => p.user_id === localUser.id) ?? null
    setMyPosition(myPos)
    if (myPos) setSelectedSide(myPos.side)

    const userIds = [...new Set(posArr.map((p) => p.user_id))]
    if (lineData.created_by && !userIds.includes(lineData.created_by)) userIds.push(lineData.created_by)
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('*').in('id', userIds)
      const map: Record<string, User> = {}
      usersData?.forEach((u: User) => { map[u.id] = u })
      setUsers(map)
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    loadData()
    const channel = supabase.channel(`line-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions', filter: `line_id=eq.${id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lines', filter: `id=eq.${id}` }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id, loadData])

  async function handleTakeSide() {
    if (!selectedSide || !line || !currentUser) return
    setBetError('')
    setBetLoading(true)

    const { error } = await supabase.from('positions').insert({
      line_id: line.id, user_id: currentUser.id, side: selectedSide, amount: line.wager_amount,
    })
    if (error) {
      setBetError(error.code === '23505' ? 'You already have a position on this line' : error.message)
      setBetLoading(false)
      return
    }
    await loadData()
    setBetLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border border-[#1e1e1e] border-t-[#a100f2] animate-spin" />
      </div>
    )
  }
  if (!line) return null

  const isExpired = new Date(line.deadline) < new Date()
  const isResolved = line.status === 'resolved'
  const isCreator = currentUser?.id === line.created_by
  const isYesNo = line.bet_type === 'yes_no'
  const odds = calcOdds(positions)
  const sides: Side[] = isYesNo ? ['yes', 'no'] : ['over', 'under']
  const totalPool = isYesNo ? odds.yesAmount + odds.noAmount : odds.overAmount + odds.underAmount

  function pct(s: Side) {
    if (s === 'yes') return odds.yesPct
    if (s === 'no') return odds.noPct
    if (s === 'over') return odds.overPct
    return odds.underPct
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-4 border-b border-[#1a1a1a]">
        <button onClick={() => router.back()}
          className="text-[10px] font-mono text-[#444] hover:text-[#666] transition-colors mb-4 block">
          ← BACK
        </button>

        <div className="flex items-start gap-2 mb-2">
          {isResolved ? (
            <span className="text-[10px] font-mono font-bold text-[#a100f2] border border-[#a100f2]/30 px-1.5 py-0.5 shrink-0">
              SETTLED
            </span>
          ) : isExpired ? (
            <span className="text-[10px] font-mono font-bold text-[#444] border border-[#1e1e1e] px-1.5 py-0.5 shrink-0">
              ENDED
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold text-[#a100f2] shrink-0">
              ● LIVE
            </span>
          )}
          {!isResolved && !isExpired && (
            <span className="text-[10px] font-mono text-[#444]">
              {formatDeadline(line.deadline)} left
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-white leading-snug">{line.question}</h1>

        {!isYesNo && line.over_under_number != null && (
          <p className="text-xs font-mono text-[#444] mt-1">
            LINE <span className="text-[#a100f2] font-bold">{line.over_under_number}</span>
          </p>
        )}
        <p className="text-[10px] font-mono text-[#444] mt-1">
          closes {formatDeadlineFull(line.deadline)}
        </p>
      </header>

      {/* Odds bar — prominent */}
      <section className="px-4 py-5 border-b border-[#1a1a1a]">
        <OddsBar positions={positions} betType={line.bet_type} size="lg" />

        <div className="flex justify-between mt-3 text-[10px] font-mono text-[#333]">
          <span>{positions.filter((p) => p.side === sides[0]).length} on {sides[0]}</span>
          <span className="text-[#555]">{formatCurrency(totalPool)} pool</span>
          <span>{positions.filter((p) => p.side === sides[1]).length} on {sides[1]}</span>
        </div>
      </section>

      {/* Action area */}
      <section className="px-4 py-5 border-b border-[#1a1a1a]">
        {isResolved ? (
          <div>
            <p className="text-[10px] font-mono text-[#444] mb-2">OUTCOME</p>
            <p className="text-4xl font-black font-mono text-[#a100f2]">
              {line.outcome?.toUpperCase()}
            </p>
            {isCreator && (
              <a href={`/resolve/${line.id}`}
                className="mt-3 text-[11px] font-mono text-[#444] hover:text-[#666] transition-colors block">
                View settlement →
              </a>
            )}
          </div>
        ) : myPosition ? (
          <div>
            <p className="text-[10px] font-mono text-[#444] mb-3">YOUR POSITION</p>
            <div className="border border-[#a100f2]/20 bg-[#a100f2]/5 p-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-black font-mono text-[#a100f2]">
                  {getSideLabel(myPosition.side, line.bet_type)}
                </p>
                <p className="text-[10px] font-mono text-[#444] mt-1">
                  {formatCurrency(myPosition.amount)} wagered
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-[#444]">TO WIN</p>
                <p className="text-xl font-mono font-bold text-white">
                  +{formatCurrency(
                    myPosition.side === sides[0]
                      ? (isYesNo ? odds.noAmount : odds.underAmount)
                      : (isYesNo ? odds.yesAmount : odds.overAmount)
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : !isExpired ? (
          <div>
            <p className="text-[10px] font-mono text-[#444] mb-3">
              TAKE A SIDE — {formatCurrency(line.wager_amount)}
            </p>
            <div className="flex gap-2 mb-4">
              {sides.map((side) => {
                const isSel = selectedSide === side
                return (
                  <button key={side} onClick={() => setSelectedSide(side)}
                    className={`flex-1 py-5 flex flex-col items-center gap-1.5 border transition-all ${
                      isSel
                        ? 'bg-[#a100f2] border-[#a100f2]'
                        : 'bg-transparent border-[#1e1e1e] hover:border-[#2a2a2a]'
                    }`}>
                    <span className={`text-2xl font-black font-mono ${isSel ? 'text-white' : 'text-[#555]'}`}>
                      {getSideLabel(side, line.bet_type)}
                    </span>
                    <span className={`text-[10px] font-mono ${isSel ? 'text-white/70' : 'text-[#333]'}`}>
                      {pct(side)}%
                    </span>
                  </button>
                )
              })}
            </div>

            {betError && <p className="text-[#ef4444] text-xs font-mono mb-3">{betError}</p>}

            <button onClick={handleTakeSide} disabled={!selectedSide || betLoading}
              className="w-full py-3.5 font-bold text-sm uppercase tracking-wider transition-opacity disabled:opacity-30 bg-[#a100f2] text-white hover:opacity-90">
              {betLoading ? 'SUBMITTING...' : selectedSide
                ? `BET ${getSideLabel(selectedSide, line.bet_type)} — ${formatCurrency(line.wager_amount)}`
                : 'SELECT A SIDE'}
            </button>
          </div>
        ) : (
          <p className="text-[11px] font-mono text-[#333] py-2">Betting closed.</p>
        )}
      </section>

      {/* Resolve button — creator only */}
      {isCreator && !isResolved && (
        <section className="px-4 py-4 border-b border-[#1a1a1a]">
          <a href={`/resolve/${line.id}`}
            className="block w-full text-center py-3 border border-[#a100f2]/30 text-[#a100f2] text-[11px] font-mono font-bold tracking-widest uppercase hover:bg-[#a100f2]/5 transition-colors">
            CALL THE OUTCOME →
          </a>
        </section>
      )}

      {/* Positions list */}
      <section className="px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444]">
            POSITIONS ({positions.length})
          </span>
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(`${window.location.origin}/join/line/${line.invite_code}`)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="text-[10px] font-mono text-[#444] hover:text-[#666] transition-colors">
            {copied ? 'COPIED ✓' : 'SHARE'}
          </button>
        </div>

        {positions.length === 0 ? (
          <p className="text-[11px] font-mono text-[#333] py-2">No positions yet.</p>
        ) : (
          <div className="border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {positions.map((pos) => {
              const posUser = users[pos.user_id]
              const isMe = pos.user_id === currentUser?.id
              return (
                <div key={pos.id} className="flex items-center justify-between px-3 py-2.5 bg-[#0f0f0f]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#1a1a1a] border border-[#1e1e1e] flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold text-[#444]">
                        {posUser?.name?.[0]?.toUpperCase() ?? '?'}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-[#888]'}`}>
                      {isMe ? 'You' : (posUser?.name ?? '—')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#444]">
                      {formatCurrency(pos.amount)}
                    </span>
                    <span className={`text-[11px] font-mono font-bold ${
                      pos.side === 'yes' || pos.side === 'over' ? 'text-[#a100f2]' : 'text-[#555]'
                    }`}>
                      {getSideLabel(pos.side, line.bet_type)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
