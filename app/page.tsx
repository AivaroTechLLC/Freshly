import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ShoppingCart, Utensils, TrendingDown, Heart } from "lucide-react"

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect("/dashboard")

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Fresh AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Your personal meal planner,<br />
          <span className="text-green-600">powered by AI</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Plan a full week of meals, build a smart grocery list from your local stores,
          and maximize savings — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Start meal planning</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            HelloFresh quality, local store prices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Utensils,
                title: "4 dinner choices nightly",
                desc: "AI generates tailored meal options based on your dietary needs and preferences.",
              },
              {
                icon: ShoppingCart,
                title: "Smart grocery list",
                desc: "Cross-optimizes quantities across the week — buy 4 cucumbers instead of 2+2.",
              },
              {
                icon: TrendingDown,
                title: "Budget optimizer",
                desc: "Real Kroger prices + live store scraping. Bulk suggestions when it saves money.",
              },
              {
                icon: Heart,
                title: "Medical dietary support",
                desc: "GLP-1, DASH (high BP), and high-fiber guidelines built into every recipe.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>Fresh AI — AI-estimated prices. Always verify at store before purchase.</p>
      </footer>
    </div>
  )
}
