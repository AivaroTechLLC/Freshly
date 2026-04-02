"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Store,
  Coffee,
  User,
  Utensils,
  Menu,
  X,
} from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meal-plan", label: "Meal Plans", icon: CalendarDays },
  { href: "/recipes", label: "Recipes", icon: BookOpen },
  { href: "/staples", label: "Staples", icon: Coffee },
  { href: "/stores", label: "Stores", icon: Store },
  { href: "/profile", label: "Profile", icon: User },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col bg-white border-r border-gray-200 fixed inset-y-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Fresh AI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-green-50 text-green-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Grocery list quick access */}
        <div className="px-3 pb-4">
          <Link
            href="/meal-plan"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2.5 text-sm font-medium transition-colors w-full"
          >
            <ShoppingCart className="w-4 h-4" />
            View Grocery List
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <Utensils className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Fresh AI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 inset-x-0 bg-white shadow-lg border-b border-gray-200 p-3 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/")
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    active
                      ? "bg-green-50 text-green-700"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 mt-14 md:mt-0 min-h-screen bg-gray-50">
        {children}
      </main>
    </div>
  )
}
