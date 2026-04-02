"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ZipCodeStep from "@/components/onboarding/ZipCodeStep"
import StoreSelectionStep from "@/components/onboarding/StoreSelectionStep"
import DietaryStep from "@/components/onboarding/DietaryStep"
import BudgetStep from "@/components/onboarding/BudgetStep"
import StaplesStep from "@/components/onboarding/StaplesStep"
import { Utensils, Check } from "lucide-react"

const STEPS = ["Location", "Stores", "Dietary", "Budget", "Staples"]

export interface OnboardingData {
  zipCode: string
  selectedStoreIds: string[]
  dietaryRestrictions: string[]
  weeklyBudget: number
  stapleItemIds: string[]
  customStaples: string[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    zipCode: "",
    selectedStoreIds: [],
    dietaryRestrictions: [],
    weeklyBudget: 150,
    stapleItemIds: [],
    customStaples: [],
  })

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  async function finish() {
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <Utensils className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">Fresh AI</span>
          <span className="text-gray-400 ml-1">— Setup</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step indicators */}
        <div className="flex items-center gap-0 mb-10">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    i < step
                      ? "bg-green-600 text-white"
                      : i === step
                      ? "bg-green-600 text-white ring-4 ring-green-100"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className="text-xs text-gray-500 hidden sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-colors ${
                    i < step ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <ZipCodeStep
            zipCode={data.zipCode}
            onChange={(zipCode) => update({ zipCode })}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StoreSelectionStep
            zipCode={data.zipCode}
            selectedStoreIds={data.selectedStoreIds}
            onChange={(selectedStoreIds) => update({ selectedStoreIds })}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <DietaryStep
            selected={data.dietaryRestrictions}
            onChange={(dietaryRestrictions) => update({ dietaryRestrictions })}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <BudgetStep
            budget={data.weeklyBudget}
            onChange={(weeklyBudget) => update({ weeklyBudget })}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <StaplesStep
            selected={data.stapleItemIds}
            customStaples={data.customStaples}
            onChange={(stapleItemIds, customStaples) =>
              update({ stapleItemIds, customStaples })
            }
            onBack={() => setStep(3)}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  )
}
