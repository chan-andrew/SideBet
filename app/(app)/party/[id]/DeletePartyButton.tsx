'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  partyId: string
  partyName: string
}

export default function DeletePartyButton({ partyId, partyName }: Props) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const supabase = createClient()

    // Delete lines (positions cascade), then party (party_members cascade)
    const { data: lines } = await supabase
      .from('lines').select('id').eq('party_id', partyId)

    if (lines && lines.length > 0) {
      await supabase.from('lines').delete().in('id', lines.map((l) => l.id))
    }

    const { error: deleteError } = await supabase
      .from('parties').delete().eq('id', partyId)

    if (deleteError) {
      setError('Failed to delete party. Try again.')
      setDeleting(false)
      return
    }

    router.push('/home')
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="mx-4 mt-4 border border-[#ef4444]/30 bg-[#ef4444]/5 p-4 rounded-md">
        <p className="text-sm font-mono text-white mb-1">
          Delete <span className="font-bold">{partyName}</span>?
        </p>
        <p className="text-[11px] font-mono text-[#666] mb-4">
          This will permanently delete the party and all its lines.
        </p>
        {error && <p className="text-[11px] font-mono text-[#ef4444] mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 bg-[#ef4444] text-white py-2 text-[11px] font-mono font-bold tracking-wider uppercase disabled:opacity-50 hover:opacity-90 active:opacity-75 transition-all duration-75 rounded-md"
          >
            {deleting ? 'DELETING...' : 'YES, DELETE'}
          </button>
          <button
            onClick={() => { setConfirming(false); setError('') }}
            disabled={deleting}
            className="flex-1 bg-[#1a1a1a] text-[#888] py-2 text-[11px] font-mono font-bold tracking-wider uppercase disabled:opacity-50 hover:text-white transition-all duration-75 rounded-md"
          >
            CANCEL
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-[10px] font-mono text-[#444] hover:text-[#ef4444] transition-colors duration-75 tracking-wider uppercase"
    >
      Delete Party
    </button>
  )
}
