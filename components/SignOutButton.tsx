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
      className="w-full py-3 border border-[#1e1e1e] text-[11px] font-mono font-bold tracking-widest text-[#444] hover:text-[#666] hover:border-[#2a2a2a] active:bg-[#a100f2]/10 active:text-[#a100f2] active:border-[#a100f2]/30 transition-all duration-75 uppercase rounded-md"
    >
      SIGN OUT
    </button>
  )
}
