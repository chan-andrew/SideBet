export const USER_COOKIE = 'sidebet_uid'

export interface LocalUser {
  id: string
  phone: string
  name: string
}

export function saveUser(user: LocalUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('sidebet_uid', user.id)
  localStorage.setItem('sidebet_phone', user.phone)
  localStorage.setItem('sidebet_name', user.name)
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
  document.cookie = `sidebet_uid=${user.id}; path=/; expires=${expires}`
}

export function getLocalUser(): LocalUser | null {
  if (typeof window === 'undefined') return null
  const id = localStorage.getItem('sidebet_uid')
  const phone = localStorage.getItem('sidebet_phone')
  const name = localStorage.getItem('sidebet_name')
  if (!id || !phone) return null
  return { id, phone, name: name ?? '' }
}

export function clearUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('sidebet_uid')
  localStorage.removeItem('sidebet_phone')
  localStorage.removeItem('sidebet_name')
  document.cookie = 'sidebet_uid=; path=/; max-age=0'
}
