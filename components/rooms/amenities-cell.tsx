import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AmenitiesCell({ amenities }: { amenities: string[] }) {
  if (amenities.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  const visibleAmenities = amenities.slice(0, 2);
  const remainingCount = amenities.length - 2;
  const remainingAmenities = amenities.slice(2);

  return (
    <div className="flex gap-1 flex-wrap items-center">
      {visibleAmenities.map((amenity, index) => (
        <Badge key={index} variant="outline" className="text-xs">
          {amenity}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs">
              +{remainingCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="flex flex-col gap-1">
              <p className="font-semibold mb-1">Tiện ích khác:</p>
              <div className="flex flex-wrap gap-1">
                {remainingAmenities.map((amenity, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs"
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

