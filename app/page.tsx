import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function RootPage() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('sidebet_uid')?.value
  redirect(userId ? '/home' : '/onboarding')
}
