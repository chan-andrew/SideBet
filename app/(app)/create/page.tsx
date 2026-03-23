'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalUser } from '@/lib/user'
import { Party, BetType } from '@/lib/types'

function CreateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'party' ? 'party' : 'line'
  const supabase = createClient()

  const [tab, setTab] = useState<'line' | 'party'>(initialTab as 'line' | 'party')

  // Line state
  const [question, setQuestion] = useState('')
  const [betType, setBetType] = useState<BetType>('yes_no')
  const [overUnderNum, setOverUnderNum] = useState('')
  const [wagerAmount, setWagerAmount] = useState('20')
  const [deadline, setDeadline] = useState('')
  const [partyId, setPartyId] = useState('')
  const [parties, setParties] = useState<Party[]>([])
  const [lineLoading, setLineLoading] = useState(false)
  const [lineError, setLineError] = useState('')

  // Party state
  const [partyName, setPartyName] = useState('')
  const [partyLoading, setPartyLoading] = useState(false)
  const [partyError, setPartyError] = useState('')

  useEffect(() => {
    const user = getLocalUser()
    if (!user) { router.push('/onboarding'); return }
    loadParties(user.id)
    const tonight = new Date()
    tonight.setHours(23, 59, 0, 0)
    setDeadline(tonight.toISOString().slice(0, 16))
  }, [])

  async function loadParties(userId: string) {
    const { data: memberships } = await supabase
      .from('party_members').select('party_id').eq('user_id', userId)
    const ids = memberships?.map((m) => m.party_id) ?? []
    if (!ids.length) return
    const { data } = await supabase.from('parties').select('*').in('id', ids).order('created_at', { ascending: false })
    setParties((data ?? []) as Party[])
  }

  async function handleCreateLine(e: React.FormEvent) {
    e.preventDefault()
    setLineError('')
    const user = getLocalUser()
    if (!user) return router.push('/onboarding')
    if (!question.trim()) return setLineError('Question is required')
    if (betType === 'over_under' && !overUnderNum) return setLineError('Enter the over/under number')
    if (!wagerAmount || parseFloat(wagerAmount) <= 0) return setLineError('Enter a wager amount')
    if (!deadline) return setLineError('Set a deadline')

    setLineLoading(true)
    const { data, error } = await supabase.from('lines').insert({
      question: question.trim(),
      bet_type: betType,
      over_under_number: betType === 'over_under' ? parseFloat(overUnderNum) : null,
      wager_amount: parseFloat(wagerAmount),
      created_by: user.id,
      party_id: partyId || null,
      deadline: new Date(deadline).toISOString(),
    }).select().single()

    if (error) { setLineError(error.message); setLineLoading(false); return }
    router.push(`/line/${data.id}`)
  }

  async function handleCreateParty(e: React.FormEvent) {
    e.preventDefault()
    setPartyError('')
    const user = getLocalUser()
    if (!user) return router.push('/onboarding')
    if (!partyName.trim()) return setPartyError('Party name is required')

    setPartyLoading(true)
    const { data, error } = await supabase.from('parties').insert({
      name: partyName.trim(),
      created_by: user.id,
    }).select().single()

    if (error) { setPartyError(error.message); setPartyLoading(false); return }
    router.push(`/party/${data.id}`)
  }

  const AMOUNTS = ['5', '10', '20', '50', '100']

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 pt-10 pb-3 border-b border-[#1a1a1a]">
        <button onClick={() => router.back()}
          className="text-[10px] font-mono text-[#444] hover:text-[#666] transition-colors mb-4 block">
          ← BACK
        </button>
        <h1 className="text-2xl font-black text-white tracking-tight">CREATE</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {(['line', 'party'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-[11px] font-mono font-bold tracking-widest uppercase transition-colors ${
              tab === t ? 'text-white border-b-2 border-[#a100f2]' : 'text-[#444] hover:text-[#666]'
            }`}>
            {t === 'line' ? 'NEW LINE' : 'NEW PARTY'}
          </button>
        ))}
      </div>

      <div className="px-4 pt-5">
        {tab === 'line' ? (
          <form onSubmit={handleCreateLine} className="flex flex-col gap-5">
            <Field label="QUESTION">
              <textarea
                value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder={'e.g. "Will Alex drink over 10 beers tonight?"'}
                rows={3} maxLength={200} autoFocus
                className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white text-sm px-3 py-3 outline-none transition-colors placeholder:text-[#2a2a2a] resize-none"
              />
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-mono text-[#333]">{question.length}/200</span>
              </div>
            </Field>

            <Field label="BET TYPE">
              <div className="flex gap-2">
                {(['yes_no', 'over_under'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setBetType(t)}
                    className={`flex-1 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider border transition-colors ${
                      betType === t
                        ? 'bg-[#a100f2] border-[#a100f2] text-white'
                        : 'bg-transparent border-[#1e1e1e] text-[#444] hover:border-[#2a2a2a]'
                    }`}>
                    {t === 'yes_no' ? 'YES / NO' : 'OVER / UNDER'}
                  </button>
                ))}
              </div>
            </Field>

            {betType === 'over_under' && (
              <Field label="THE NUMBER">
                <input type="number" value={overUnderNum} onChange={(e) => setOverUnderNum(e.target.value)}
                  placeholder="10" step="0.5" min="0"
                  className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white text-3xl font-mono font-bold px-3 py-3 outline-none transition-colors placeholder:text-[#2a2a2a]"
                />
              </Field>
            )}

            <Field label="WAGER PER SIDE ($)">
              <div className="flex gap-1.5 mb-2">
                {AMOUNTS.map((a) => (
                  <button key={a} type="button" onClick={() => setWagerAmount(a)}
                    className={`flex-1 py-2 text-[11px] font-mono font-bold border transition-colors ${
                      wagerAmount === a
                        ? 'bg-[#a100f2] border-[#a100f2] text-white'
                        : 'bg-transparent border-[#1e1e1e] text-[#444] hover:border-[#2a2a2a]'
                    }`}>
                    ${a}
                  </button>
                ))}
              </div>
              <input type="number" value={wagerAmount} onChange={(e) => setWagerAmount(e.target.value)}
                placeholder="Custom" min="1" step="1"
                className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white text-xl font-mono font-bold px-3 py-2.5 outline-none transition-colors placeholder:text-[#2a2a2a]"
              />
            </Field>

            <Field label="DEADLINE">
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white px-3 py-3 outline-none transition-colors font-mono text-sm"
              />
            </Field>

            {parties.length > 0 && (
              <Field label="PARTY (OPTIONAL)">
                <select value={partyId} onChange={(e) => setPartyId(e.target.value)}
                  className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white px-3 py-3 outline-none transition-colors font-mono text-sm">
                  <option value="">No party</option>
                  {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
            )}

            {lineError && <p className="text-[#ef4444] text-xs font-mono">{lineError}</p>}

            <button type="submit" disabled={lineLoading}
              className="w-full bg-[#a100f2] text-white py-3.5 font-bold text-sm tracking-wider uppercase disabled:opacity-40 hover:opacity-90 transition-opacity">
              {lineLoading ? 'POSTING...' : 'POST LINE →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateParty} className="flex flex-col gap-5">
            <Field label="PARTY NAME">
              <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)}
                placeholder={'e.g. "Friday Boys"'} maxLength={50} autoFocus
                className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white text-xl font-semibold px-3 py-3 outline-none transition-colors placeholder:text-[#2a2a2a]"
              />
            </Field>

            <p className="text-[11px] font-mono text-[#333] border border-[#1a1a1a] p-3">
              After creating, you&apos;ll get an invite link to share with friends.
            </p>

            {partyError && <p className="text-[#ef4444] text-xs font-mono">{partyError}</p>}

            <button type="submit" disabled={partyLoading || !partyName.trim()}
              className="w-full bg-[#a100f2] text-white py-3.5 font-bold text-sm tracking-wider uppercase disabled:opacity-30 hover:opacity-90 transition-opacity">
              {partyLoading ? 'CREATING...' : 'CREATE PARTY →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-[#444] mb-1.5 uppercase">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <CreateForm />
    </Suspense>
  )
}
