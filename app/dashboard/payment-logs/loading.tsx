export default function PaymentLogsLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Webhook Thanh toán</h1>
          <p className="text-muted-foreground text-sm">
            Xem và theo dõi lịch sử webhook thanh toán từ hệ thống
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <div className="space-y-4">
          <div className="h-10 bg-muted rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
