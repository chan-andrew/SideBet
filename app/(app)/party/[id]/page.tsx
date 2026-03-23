import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LineCard from '@/components/LineCard'
import CopyInviteButton from './CopyInviteButton'
import { Line, Position, User, Party } from '@/lib/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PartyPage({ params }: PageProps) {
  const { id } = await params
  const cookieStore = await cookies()
  const userId = cookieStore.get('sidebet_uid')?.value
  if (!userId) redirect('/onboarding')

  const supabase = createClient()
  const { data: partyData } = await supabase.from('parties').select('*').eq('id', id).single()
  if (!partyData) notFound()
  const party = partyData as Party

  const { data: membership } = await supabase
    .from('party_members').select('*').eq('party_id', party.id).eq('user_id', userId).single()
  if (!membership) redirect(`/join/party/${party.invite_code}`)

  const { data: membersData } = await supabase.from('party_members').select('*').eq('party_id', party.id)
  const memberIds = membersData?.map((m) => m.user_id) ?? []
  const { data: usersData } = memberIds.length
    ? await supabase.from('users').select('*').in('id', memberIds) : { data: [] }
  const members = (usersData ?? []) as User[]

  const { data: linesData } = await supabase
    .from('lines').select('*').eq('party_id', party.id).order('created_at', { ascending: false })
  const lines = (linesData ?? []) as Line[]
  const lineIds = lines.map((l) => l.id)

  const { data: positionsData } = lineIds.length
    ? await supabase.from('positions').select('*').in('line_id', lineIds) : { data: [] }
  const positions = (positionsData ?? []) as Position[]

  const openLines = lines.filter((l) => l.status === 'open')
  const resolvedLines = lines.filter((l) => l.status === 'resolved')

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-4 border-b border-[#1a1a1a]">
        <Link href="/home"
          className="text-[10px] font-mono text-[#444] hover:text-[#666] transition-colors mb-4 block">
          ← BACK
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-1">PARTY</p>
            <h1 className="text-2xl font-black text-white tracking-tight">{party.name}</h1>
          </div>
          <Link href={`/create?partyId=${party.id}`}
            className="bg-[#a100f2] text-white px-3 py-2 text-[11px] font-mono font-bold tracking-wider uppercase hover:opacity-90 transition-opacity">
            + LINE
          </Link>
        </div>

        {/* Members row */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex -space-x-1.5">
            {members.slice(0, 6).map((m) => (
              <div key={m.id} title={m.name}
                className="w-6 h-6 bg-[#1a1a1a] border border-[#0a0a0a] flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-[#555]">
                  {m.name[0].toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <span className="text-[10px] font-mono text-[#444]">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </span>
        </div>
      </header>

      {/* Invite */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <p className="text-[10px] font-mono text-[#333]">
          /join/party/{party.invite_code}
        </p>
        <CopyInviteButton inviteCode={party.invite_code} />
      </div>

      {/* Open lines */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444]">
            OPEN LINES ({openLines.length})
          </span>
        </div>

        {openLines.length === 0 ? (
          <div className="border border-dashed border-[#1a1a1a] py-8 text-center">
            <p className="text-[11px] font-mono text-[#333] mb-3">No open lines</p>
            <Link href={`/create?partyId=${party.id}`}
              className="text-[11px] font-mono text-[#a100f2] hover:opacity-80 transition-opacity">
              Post the first line →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {openLines.map((line) => (
              <LineCard key={line.id} line={line}
                positions={positions.filter((p) => p.line_id === line.id)}
                currentUserId={userId} />
            ))}
          </div>
        )}
      </section>

      {resolvedLines.length > 0 && (
        <section className="px-4 pt-6">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-3">
            SETTLED ({resolvedLines.length})
          </p>
          <div className="flex flex-col border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
            {resolvedLines.map((line) => (
              <LineCard key={line.id} line={line}
                positions={positions.filter((p) => p.line_id === line.id)}
                currentUserId={userId} />
            ))}
          </div>
        </section>
      )}

      {/* Members list */}
      <section className="px-4 pt-6 pb-4">
        <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-3">MEMBERS</p>
        <div className="border border-[#1a1a1a] divide-y divide-[#1a1a1a]">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-3 py-2.5 bg-[#0f0f0f]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#1a1a1a] border border-[#1e1e1e] flex items-center justify-center">
                  <span className="text-[11px] font-mono font-bold text-[#555]">
                    {m.name[0].toUpperCase()}
                  </span>
                </div>
                <span className={`text-sm font-medium ${m.id === userId ? 'text-white' : 'text-[#888]'}`}>
                  {m.id === userId ? `${m.name} (you)` : m.name}
                </span>
              </div>
              {m.id === party.created_by && (
                <span className="text-[9px] font-mono font-bold text-[#a100f2] tracking-widest">HOST</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
