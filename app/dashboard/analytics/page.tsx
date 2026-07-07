import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const HotelPerformanceDashboard = dynamic(
  () =>
    import("@/components/hotel-performance-dashboard").then(
      (m) => m.HotelPerformanceDashboard
    ),
  {
    loading: () => (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    ),
  }
);

export default function HotelAnalyticsPage() {
  return <HotelPerformanceDashboard />;
}
