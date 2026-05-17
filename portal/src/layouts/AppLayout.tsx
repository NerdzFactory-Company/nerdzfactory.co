import { useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { Drawer } from '@/components/layout/Drawer'

export function AppLayout() {
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <TopBar onOpenDrawer={() => setDrawerOpen(true)} />

        <main className="flex-1 px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>

        <MobileNav onOpenDrawer={() => setDrawerOpen(true)} />
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  )
}
