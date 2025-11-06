"use client"

import { useRouter, useParams } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { UserForm, UserFormValues } from "@/components/user-form"
import { getUserById } from "../../data"

export default function EditUserPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const [user, setUser] = useState<ReturnType<typeof getUserById>>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      await new Promise(r => setTimeout(r, 500))
      const userData = getUserById(userId)
      setUser(userData || undefined)
      setLoading(false)
    }
    if (userId) fetchUser()
  }, [userId])

  const defaultValues: Partial<UserFormValues> | undefined = user
    ? {
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      }
    : undefined

  if (loading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 cursor-pointer">
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chỉnh sửa người dùng</h1>
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 cursor-pointer">
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Không tìm thấy người dùng</h1>
            <p className="text-muted-foreground text-sm">
              Người dùng không tồn tại hoặc đã bị xóa
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 cursor-pointer">
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Chỉnh sửa người dùng</h1>
          <p className="text-muted-foreground text-sm">Cập nhật thông tin {user.name}</p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <UserForm mode="edit" userId={userId} defaultValues={defaultValues} />
      </div>
    </div>
  )
}
