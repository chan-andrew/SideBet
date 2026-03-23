import BottomNav from '@/components/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <main className="max-w-lg mx-auto pb-20">{children}</main>
      <BottomNav />
    </div>
  )
}
