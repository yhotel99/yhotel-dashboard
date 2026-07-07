export default function RefundRequestsLoading() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold">Quản lý yêu cầu hoàn tiền</h1>
          <p className="text-muted-foreground text-sm">
            Quản lý và theo dõi các yêu cầu hoàn tiền
          </p>
        </div>
      </div>
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    </div>
  );
}
