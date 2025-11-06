"use client"

import { useRouter } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { CustomerForm } from "@/components/customer-form"

export default function CreateCustomerPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center gap-4 px-4 lg:px-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="h-10 w-10 cursor-pointer"
        >
          <IconArrowLeft className="size-4" />
          <span className="sr-only">Quay lại</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Tạo khách hàng mới</h1>
          <p className="text-muted-foreground text-sm">
            Thêm khách hàng mới vào hệ thống
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <CustomerForm mode="create" />
      </div>
    </div>
  )
}
