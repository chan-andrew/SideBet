import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LineCard from '@/components/LineCard'
import { Line, Position, Party } from '@/lib/types'

export default async function HomePage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('sidebet_uid')?.value
  if (!userId) redirect('/onboarding')

  const supabase = createClient()

  const { data: profile } = await supabase
    .from('users').select('name').eq('id', userId).single()
  if (!profile) redirect('/onboarding')

  // Lines where user has a position or created
  const { data: myPositions } = await supabase
    .from('positions').select('line_id').eq('user_id', userId)
  const posLineIds = myPositions?.map((p) => p.line_id) ?? []

  const { data: linesRaw } = await supabase
    .from('lines')
    .select('*')
    .or(`created_by.eq.${userId}${posLineIds.length > 0 ? `,id.in.(${posLineIds.join(',')})` : ''}`)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20)
  const lines = (linesRaw ?? []) as Line[]

  const lineIds = lines.map((l) => l.id)
  const { data: allPos } = lineIds.length
    ? await supabase.from('positions').select('*').in('line_id', lineIds)
    : { data: [] }
  const positions = (allPos ?? []) as Position[]

  // Parties
  const { data: memberships } = await supabase
    .from('party_members').select('party_id').eq('user_id', userId)
  const partyIds = memberships?.map((m) => m.party_id) ?? []

  const { data: partiesRaw } = partyIds.length
    ? await supabase.from('parties').select('*').in('id', partyIds).order('created_at', { ascending: false })
    : { data: [] }
  const parties = (partiesRaw ?? []) as Party[]

  const { data: partyLineRows } = partyIds.length
    ? await supabase.from('lines').select('party_id').in('party_id', partyIds).eq('status', 'open')
    : { data: [] }
  const lineCountMap: Record<string, number> = {}
  partyLineRows?.forEach((l) => {
    if (l.party_id) lineCountMap[l.party_id] = (lineCountMap[l.party_id] ?? 0) + 1
  })

  const { data: memberRows } = partyIds.length
    ? await supabase.from('party_members').select('party_id').in('party_id', partyIds)
    : { data: [] }
  const memberCountMap: Record<string, number> = {}
  memberRows?.forEach((m) => {
    memberCountMap[m.party_id] = (memberCountMap[m.party_id] ?? 0) + 1
  })

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-10 pb-3 border-b border-[#1a1a1a]">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white">
            SIDE<span className="text-[#a100f2]">BET</span>
          </h1>
          <p className="text-[10px] font-mono text-[#444] mt-0.5">{profile.name}</p>
        </div>
        <Link href="/create"
          className="bg-[#a100f2] text-white px-3 py-2 text-[11px] font-mono font-bold tracking-wider uppercase hover:opacity-90 transition-opacity">
          + NEW LINE
        </Link>
      </header>

      {/* Open lines */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] uppercase">
            Open Lines
          </span>
          <span className="text-[10px] font-mono text-[#333]">{lines.length}</span>
        </div>

        {lines.length === 0 ? (
          <div className="border border-dashed border-[#1a1a1a] py-10 text-center">
            <p className="text-[11px] font-mono text-[#333] mb-3">No open lines</p>
            <Link href="/create"
              className="text-[11px] font-mono text-[#a100f2] hover:opacity-80 transition-opacity">
              Post your first line →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-px border border-[#1a1a1a]">
            {lines.map((line) => (
              <LineCard
                key={line.id}
                line={line}
                positions={positions.filter((p) => p.line_id === line.id)}
                currentUserId={userId}
              />
            ))}
          </div>
        )}
      </section>

      {/* Parties */}
      <section className="px-4 pt-7">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] uppercase">
            Parties
          </span>
          <Link href="/create?tab=party"
            className="text-[10px] font-mono text-[#444] hover:text-[#666] transition-colors">
            + NEW
          </Link>
        </div>

        {parties.length === 0 ? (
          <div className="border border-dashed border-[#1a1a1a] py-8 text-center">
            <p className="text-[11px] font-mono text-[#333] mb-3">No parties yet</p>
            <Link href="/create?tab=party"
              className="text-[11px] font-mono text-[#444] hover:text-[#666] transition-colors">
              Start a group →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {parties.map((party) => (
              <Link key={party.id} href={`/party/${party.id}`}>
                <div className="bg-[#0f0f0f] px-4 py-3 flex items-center justify-between hover:bg-[#111] transition-colors">
                  <div>
                    <p className="text-white text-sm font-semibold">{party.name}</p>
                    <p className="text-[10px] font-mono text-[#444] mt-0.5">
                      {memberCountMap[party.id] ?? 1} members
                      {' · '}
                      {lineCountMap[party.id] ?? 0} open
                    </p>
                  </div>
                  <span className="text-[#a100f2] text-xs font-mono">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="h-8" />
    </div>
  )
}
