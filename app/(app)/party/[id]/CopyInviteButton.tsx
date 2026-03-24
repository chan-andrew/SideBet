'use client'

import { useState } from 'react'

export default function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const link = `${window.location.origin}/join/party/${inviteCode}`
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="text-xs font-bold uppercase tracking-widest text-[#555] border border-[#2a2a2a] px-3 py-1.5 hover:border-[#3a3a3a] hover:text-[#999] active:bg-[#a100f2]/10 active:text-[#a100f2] active:border-[#a100f2]/30 transition-all duration-75 rounded"
    >
      {copied ? 'COPIED ✓' : 'COPY'}
    </button>
  )
}
