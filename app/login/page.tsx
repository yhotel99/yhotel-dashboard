"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd } from "lucide-react"

import { LoginForm } from "@/components/login-form"
import { useAuth } from "@/contexts/auth-context"

export default function LoginPage() {
  const router = useRouter()
  const { currentUser, isLoading, isInitialized } = useAuth()

  useEffect(() => {
    if (isInitialized && currentUser && !isLoading) {
      router.push("/dashboard")
    }
  }, [currentUser, isLoading, isInitialized, router])

  if (isLoading || !isInitialized) {
    return (
      <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2 self-center font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            YHotel
          </div>
          <div className="text-center text-muted-foreground">Đang tải...</div>
        </div>
      </div>
    )
  }

  if (currentUser) {
    return null
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          YHotel
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
