'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getLocalUser } from '@/lib/user'

export default function JoinPage() {
  const router = useRouter()
  const params = useParams()
  const pathArr = params.path as string[]
  const type = pathArr?.[0]
  const code = pathArr?.[1]
  const supabase = createClient()

  const [status, setStatus] = useState<'loading' | 'error' | 'success'>('loading')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    if (!type || !code) { setStatus('error'); setMessage('Invalid invite link'); return }
    handleJoin()
  }, [])

  async function handleJoin() {
    const user = getLocalUser()
    if (!user) {
      sessionStorage.setItem('joinIntent', JSON.stringify({ type, code }))
      router.push('/onboarding')
      return
    }

    if (type === 'party') await joinParty(code, user.id)
    else if (type === 'line') await joinLine(code)
    else { setStatus('error'); setMessage('Unknown invite type') }
  }

  async function joinParty(inviteCode: string, userId: string) {
    const { data: party } = await supabase.from('parties').select('*').eq('invite_code', inviteCode).single()
    if (!party) { setStatus('error'); setMessage('Party not found — link may be invalid'); return }
    setName(party.name)

    const { data: existing } = await supabase
      .from('party_members').select('*').eq('party_id', party.id).eq('user_id', userId).single()
    if (existing) { router.push(`/party/${party.id}`); return }

    const { error } = await supabase.from('party_members').insert({ party_id: party.id, user_id: userId })
    if (error) { setStatus('error'); setMessage(error.message); return }

    setStatus('success')
    setTimeout(() => router.push(`/party/${party.id}`), 1000)
  }

  async function joinLine(inviteCode: string) {
    const { data: line } = await supabase.from('lines').select('*').eq('invite_code', inviteCode).single()
    if (!line) { setStatus('error'); setMessage('Line not found — link may be invalid'); return }
    setName(line.question)
    setStatus('success')
    setTimeout(() => router.push(`/line/${line.id}`), 600)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-black text-white mb-6">
          SIDE<span className="text-[#a100f2]">BET</span>
        </h1>

        {status === 'loading' && (
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border border-[#1e1e1e] border-t-[#a100f2] animate-spin" />
            <span className="text-[11px] font-mono text-[#444]">JOINING...</span>
          </div>
        )}

        {status === 'success' && (
          <div className="border border-[#a100f2]/20 bg-[#a100f2]/5 p-4">
            <p className="text-[10px] font-mono font-bold text-[#a100f2] mb-1">
              {type === 'party' ? 'JOINED PARTY' : 'OPENING LINE'}
            </p>
            <p className="text-white font-semibold text-sm">{name}</p>
            <p className="text-[10px] font-mono text-[#444] mt-2">Redirecting...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-4">
            <div className="border border-[#1e1e1e] p-4">
              <p className="text-[10px] font-mono font-bold text-[#444] mb-1">ERROR</p>
              <p className="text-sm text-[#888]">{message}</p>
            </div>
            <button onClick={() => router.push('/home')}
              className="w-full py-3 border border-[#1e1e1e] text-[11px] font-mono font-bold tracking-widest text-[#444] hover:text-[#666] transition-colors uppercase">
              GO HOME
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
