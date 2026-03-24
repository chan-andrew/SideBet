'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalUser } from '@/lib/user'
import { Line, Position, User, Side } from '@/lib/types'
import { formatCurrency, getSideLabel, calcSettlement } from '@/lib/utils'

export default function ResolvePage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const supabase = createClient()

  const [line, setLine] = useState<Line | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [outcome, setOutcome] = useState<Side | null>(null)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')
  const [resolved, setResolved] = useState(false)

  const loadData = useCallback(async () => {
    const localUser = getLocalUser()
    if (!localUser) { router.push('/onboarding'); return }
    setCurrentUserId(localUser.id)

    const { data: lineData } = await supabase.from('lines').select('*').eq('id', id).single()
    if (!lineData) { router.push('/home'); return }
    if (lineData.created_by !== localUser.id) { router.push(`/line/${id}`); return }

    setLine(lineData as Line)
    if (lineData.status === 'resolved') {
      setOutcome(lineData.outcome as Side)
      setResolved(true)
    }

    const { data: posData } = await supabase.from('positions').select('*').eq('line_id', id)
    const posArr = (posData ?? []) as Position[]
    setPositions(posArr)

    const userIds = [...new Set(posArr.map((p) => p.user_id))]
    if (userIds.length > 0) {
      const { data: usersData } = await supabase.from('users').select('*').in('id', userIds)
      const map: Record<string, User> = {}
      usersData?.forEach((u: User) => { map[u.id] = u })
      setUsers(map)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  async function handleResolve() {
    if (!outcome || !line || !currentUserId) return
    setResolving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('lines').update({ status: 'resolved', outcome })
      .eq('id', line.id).eq('created_by', currentUserId)

    if (updateError) { setError(updateError.message); setResolving(false); return }
    setResolved(true)
    setResolving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border border-[#1e1e1e] border-t-[#a100f2] animate-spin" />
      </div>
    )
  }
  if (!line) return null

  const isYesNo = line.bet_type === 'yes_no'
  const sides: Side[] = isYesNo ? ['yes', 'no'] : ['over', 'under']
  const settlements = outcome ? calcSettlement(positions, outcome) : []
  const winners = settlements.filter((s) => s.net > 0)
  const losers = settlements.filter((s) => s.net < 0)

  return (
    <div className="flex flex-col">
      <header className="px-4 pt-10 pb-4 border-b border-[#1a1a1a]">
        <button onClick={() => router.push(`/line/${id}`)}
          className="text-[10px] font-mono text-[#444] hover:text-[#666] active:bg-[#a100f2]/10 active:text-[#a100f2] transition-all duration-75 mb-4 block px-2 py-1 -ml-2 rounded">
          ← BACK
        </button>
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#a100f2] mb-1">
          RESOLVE LINE
        </p>
        <h1 className="text-xl font-bold text-white leading-snug">{line.question}</h1>
        {!isYesNo && line.over_under_number != null && (
          <p className="text-xs font-mono text-[#444] mt-1">
            LINE <span className="text-[#a100f2]">{line.over_under_number}</span>
          </p>
        )}
      </header>

      <div className="px-4 py-5 flex flex-col gap-5">
        {!resolved ? (
          <>
            <div>
              <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-3">
                WHAT HAPPENED?
              </p>
              <div className="flex gap-2">
                {sides.map((side) => (
                  <button key={side} onClick={() => setOutcome(side)}
                    className={`flex-1 py-7 text-center border transition-all duration-75 rounded-lg ${
                      outcome === side
                        ? 'bg-[#a100f2] border-[#a100f2] active:opacity-75'
                        : 'bg-transparent border-[#1e1e1e] hover:border-[#2a2a2a] active:bg-[#a100f2]/10 active:border-[#a100f2]/30 active:scale-[0.98]'
                    }`}>
                    <span className={`text-3xl font-black font-mono ${outcome === side ? 'text-white' : 'text-[#444]'}`}>
                      {getSideLabel(side, line.bet_type)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Settlement preview */}
            {outcome && positions.length > 0 && (
              <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1a1a1a]">
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444]">
                    SETTLEMENT PREVIEW
                  </span>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {calcSettlement(positions, outcome).map((s) => {
                    const u = users[s.userId]
                    const isMe = s.userId === currentUserId
                    return (
                      <div key={s.userId} className="flex items-center justify-between px-3 py-2.5 bg-[#0f0f0f]">
                        <span className={`text-sm font-medium ${isMe ? 'text-white' : 'text-[#888]'}`}>
                          {isMe ? 'You' : u?.name ?? '—'}
                        </span>
                        <span className={`text-sm font-mono font-bold ${s.net > 0 ? 'text-[#a100f2]' : 'text-[#444]'}`}>
                          {s.net > 0 ? `+${formatCurrency(s.net)}` : `−${formatCurrency(Math.abs(s.net))}`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {positions.length === 0 && (
              <p className="text-[11px] font-mono text-[#333] border border-dashed border-[#1a1a1a] p-4 text-center">
                No positions were placed on this line.
              </p>
            )}

            {error && <p className="text-[#ef4444] text-xs font-mono">{error}</p>}

            <button onClick={handleResolve} disabled={!outcome || resolving}
              className="w-full py-3.5 font-bold text-sm uppercase tracking-wider bg-[#a100f2] text-white disabled:opacity-30 hover:opacity-90 active:opacity-75 transition-all duration-75 rounded-md">
              {resolving ? 'SETTLING...' : outcome ? `CALL IT: ${getSideLabel(outcome, line.bet_type)} →` : 'SELECT OUTCOME'}
            </button>
          </>
        ) : (
          <>
            {/* Settled state */}
            <div className="py-4 border-b border-[#1a1a1a]">
              <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#a100f2] mb-2">OUTCOME</p>
              <p className="text-5xl font-black font-mono text-white">{outcome?.toUpperCase()}</p>
            </div>

            {/* Final settlement table */}
            {positions.length > 0 && outcome && (
              <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444]">SETTLEMENT</span>
                  <span className="text-[10px] font-mono text-[#333]">{positions.length} participants</span>
                </div>

                {winners.length > 0 && (
                  <div className="border-b border-[#1a1a1a]">
                    <div className="px-3 py-1.5 bg-[#0f0f0f]">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-[#444]">WINNERS</span>
                    </div>
                    {winners.map((s) => (
                      <div key={s.userId} className="flex items-center justify-between px-3 py-2.5 border-t border-[#1a1a1a]">
                        <span className="text-sm font-medium text-white">
                          {s.userId === currentUserId ? 'You' : users[s.userId]?.name ?? '—'}
                        </span>
                        <span className="text-sm font-mono font-bold text-[#a100f2]">
                          +{formatCurrency(s.net)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {losers.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 bg-[#0f0f0f]">
                      <span className="text-[9px] font-mono font-bold tracking-widest text-[#444]">OWES</span>
                    </div>
                    {losers.map((s) => (
                      <div key={s.userId} className="flex items-center justify-between px-3 py-2.5 border-t border-[#1a1a1a]">
                        <span className="text-sm font-medium text-[#888]">
                          {s.userId === currentUserId ? 'You' : users[s.userId]?.name ?? '—'}
                        </span>
                        <span className="text-sm font-mono font-bold text-[#555]">
                          −{formatCurrency(Math.abs(s.net))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => router.push('/home')}
              className="w-full py-3 border border-[#1e1e1e] text-[11px] font-mono font-bold tracking-widest text-[#444] hover:text-[#666] hover:border-[#2a2a2a] active:bg-[#a100f2]/10 active:text-[#a100f2] active:border-[#a100f2]/30 transition-all duration-75 uppercase rounded-md">
              BACK TO HOME
            </button>
          </>
        )}
      </div>
    </div>
  )
}
