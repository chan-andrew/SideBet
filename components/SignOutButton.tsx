'use client'

import { useRouter } from 'next/navigation'
import { clearUser } from '@/lib/user'

export default function SignOutButton() {
  const router = useRouter()

  function handleSignOut() {
    clearUser()
    router.push('/onboarding')
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full py-3 border border-[#1e1e1e] text-[11px] font-mono font-bold tracking-widest text-[#444] hover:text-[#666] hover:border-[#2a2a2a] transition-colors uppercase"
    >
      SIGN OUT
    </button>
  )
}
