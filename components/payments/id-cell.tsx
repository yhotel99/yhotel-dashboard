"use client";

import { useState } from "react";
import { IconCopy, IconCheck } from "@tabler/icons-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IdCellProps {
  id: string;
  displayLength?: number;
  className?: string;
}

export function IdCell({ id, displayLength = 8, className }: IdCellProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast.success("Đã sao chép", {
        description: "Mã đã được sao chép vào clipboard",
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Không thể sao chép", {
        description: "Vui lòng thử lại",
      });
    }
  };

  const displayId = `${id.slice(0, displayLength)}...`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-xs cursor-default">{displayId}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-sm">{id}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
          >
            {copied ? (
              <IconCheck className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <IconCopy className="h-3.5 w-3.5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Đã sao chép" : "Sao chép mã"}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

