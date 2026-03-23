'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveUser } from '@/lib/user'

function isValidPhone(v: string): boolean {
  return v.replace(/\D/g, '').length >= 10
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function formatPhone(raw: string): string {
    const d = raw.replace(/\D/g, '')
    if (d.length <= 3) return d
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (trimmedName.length < 2) {
      setError('Enter your name (at least 2 characters)')
      return
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid phone number')
      return
    }

    setLoading(true)
    const digits = phone.replace(/\D/g, '')
    const normalized = digits.length === 10 ? `1${digits}` : digits

    // Check if user exists (maybeSingle returns null instead of 406 when not found)
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalized)
      .maybeSingle()

    const redirectAfter = () => {
      const intent = sessionStorage.getItem('joinIntent')
      if (intent) {
        sessionStorage.removeItem('joinIntent')
        const { type, code } = JSON.parse(intent)
        router.push(`/join/${type}/${code}`)
      } else {
        router.push('/home')
      }
    }

    if (existing) {
      saveUser({ id: existing.id, phone: existing.phone, name: existing.name })
      redirectAfter()
      return
    }

    // Create new user (generate id client-side to avoid DB default issues)
    const newId = crypto.randomUUID()
    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert({ id: newId, name: trimmedName, phone: normalized })
      .select()
      .single()

    if (insertError || !created) {
      setError(insertError?.message ?? 'Something went wrong. Try again.')
      setLoading(false)
      return
    }

    saveUser({ id: created.id, phone: created.phone, name: created.name })
    redirectAfter()
  }

  const canSubmit = name.trim().length >= 2 && isValidPhone(phone) && !loading

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-16 pb-6">
        <p className="text-[10px] font-mono font-bold tracking-[0.25em] text-[#444] mb-2">
          PREDICTION MARKETS
        </p>
        <h1 className="text-5xl font-black tracking-tight text-white leading-none">
          SIDE<span className="text-[#a100f2]">BET</span>
        </h1>
        <p className="mt-2 text-sm text-[#555] font-mono">
          friend group markets
        </p>
      </div>

      <div className="h-px bg-[#1a1a1a] mx-5" />

      {/* Form */}
      <div className="flex-1 px-5 pt-6 flex flex-col gap-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name field */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-[#555] mb-1.5">
              NAME
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="Alex"
              maxLength={30}
              autoFocus
              autoComplete="name"
              className="w-full bg-[#111] border border-[#1e1e1e] focus:border-[#a100f2] text-white text-lg font-semibold px-3 py-3 outline-none transition-colors placeholder:text-[#333]"
            />
          </div>

          {/* Phone field */}
          <div>
            <label className="block text-[10px] font-mono font-bold tracking-[0.2em] text-[#555] mb-1.5">
              PHONE
            </label>
            <div className="flex border border-[#1e1e1e] focus-within:border-[#a100f2] transition-colors">
              <div className="flex items-center px-3 border-r border-[#1e1e1e] bg-[#0f0f0f]">
                <span className="text-[#444] text-sm font-mono">+1</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError('') }}
                placeholder="(555) 867-5309"
                maxLength={14}
                autoComplete="tel"
                className="flex-1 bg-[#111] text-white text-lg font-mono px-3 py-3 outline-none placeholder:text-[#333]"
              />
            </div>
          </div>

          {error && (
            <p className="text-[#ef4444] text-xs font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-[#a100f2] text-white py-3.5 font-bold text-sm tracking-wider uppercase disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity mt-1"
          >
            {loading ? 'LOADING...' : 'CONTINUE →'}
          </button>
        </form>

        {/* Returning users note */}
        <p className="text-[11px] text-[#333] font-mono text-center">
          Returning user? Enter your same phone number to pick up where you left off.
        </p>

        {/* How it works */}
        <div className="mt-auto pt-8 border-t border-[#1a1a1a]">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#333] mb-3">
            HOW IT WORKS
          </p>
          {[
            ['01', 'POST A LINE — any bet, any stakes'],
            ['02', 'SIDES — friends take yes/no or over/under'],
            ['03', 'SETTLE — one tap to call the result'],
          ].map(([n, t]) => (
            <div key={n} className="flex gap-3 mb-2">
              <span className="text-[10px] font-mono text-[#333] shrink-0 mt-px">{n}</span>
              <span className="text-[11px] font-mono text-[#444]">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
