"use client"

import { useRouter, useParams } from "next/navigation"
import { IconArrowLeft } from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { CustomerForm, type CustomerFormValues } from "@/components/customer-form"
import { getCustomerById } from "../../data"

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams()
  const customerId = params.id as string
  const [customer, setCustomer] = useState<ReturnType<typeof getCustomerById>>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustomer = async () => {
      setLoading(true)
      await new Promise((r) => setTimeout(r, 500))
      const data = getCustomerById(customerId)
      setCustomer(data || undefined)
      setLoading(false)
    }
    if (customerId) fetchCustomer()
  }, [customerId])

  const defaultValues: Partial<CustomerFormValues> | undefined = customer
    ? {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        status: customer.status,
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
            <h1 className="text-2xl font-bold">Chỉnh sửa khách hàng</h1>
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center gap-4 px-4 lg:px-6">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-10 w-10 cursor-pointer">
            <IconArrowLeft className="size-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Không tìm thấy khách hàng</h1>
            <p className="text-muted-foreground text-sm">Khách hàng không tồn tại hoặc đã bị xóa</p>
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
          <h1 className="text-2xl font-bold">Chỉnh sửa khách hàng</h1>
          <p className="text-muted-foreground text-sm">Cập nhật thông tin {customer.name}</p>
        </div>
      </div>

      <div className="px-4 lg:px-6">
        <CustomerForm mode="edit" defaultValues={defaultValues} />
      </div>
    </div>
  )
}
