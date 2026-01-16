"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  IconCheck,
  IconCurrencyDollar,
  IconEye,
  IconX,
} from "@tabler/icons-react";
import type {
  RefundRequestStatus,
  RefundRequest,
  RefundRequestWithRelations,
} from "@/lib/types";
import { REFUND_REQUEST_STATUS } from "@/lib/constants";
import { formatCurrency } from "@/lib/functions";

export function RefundRequestActionsCell({
  refundRequest,
  onStatusChange,
  updateRefundRequestStatus,
  onViewDetail,
}: {
  refundRequest: RefundRequestWithRelations;
  onStatusChange: () => void;
  updateRefundRequestStatus: (
    id: string,
    status: RefundRequestStatus
  ) => Promise<RefundRequest>;
  onViewDetail: (refundRequest: RefundRequestWithRelations) => void;
}) {
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [openRefund, setOpenRefund] = useState(false);

  const handleApprove = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.APPROVED
      );
      toast.success("Đã duyệt yêu cầu hoàn tiền");
      setOpenApprove(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể duyệt yêu cầu hoàn tiền"
      );
    }
  };

  const handleReject = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.REJECTED
      );
      toast.success("Đã từ chối yêu cầu hoàn tiền");
      setOpenReject(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể từ chối yêu cầu hoàn tiền"
      );
    }
  };

  const handleRefund = async () => {
    try {
      await updateRefundRequestStatus(
        refundRequest.id,
        REFUND_REQUEST_STATUS.REFUNDED
      );
      toast.success("Đã hoàn tiền thành công");
      setOpenRefund(false);
      onStatusChange();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể hoàn tiền"
      );
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onViewDetail(refundRequest)}
            >
              <IconEye className="size-4" />
              <span className="sr-only">Xem chi tiết</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Xem chi tiết</TooltipContent>
        </Tooltip>

        {refundRequest.status === REFUND_REQUEST_STATUS.PENDING && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => setOpenApprove(true)}
                >
                  <IconCheck className="size-4" />
                  <span className="sr-only">Duyệt yêu cầu</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Duyệt yêu cầu</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setOpenReject(true)}
                >
                  <IconX className="size-4" />
                  <span className="sr-only">Từ chối</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Từ chối</TooltipContent>
            </Tooltip>
          </>
        )}

        {refundRequest.status === REFUND_REQUEST_STATUS.APPROVED && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => setOpenRefund(true)}
              >
                <IconCurrencyDollar className="size-4" />
                <span className="sr-only">Hoàn tiền</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hoàn tiền</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Approve Confirmation Dialog */}
      {openApprove && (
        <Dialog open={openApprove} onOpenChange={setOpenApprove}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận duyệt yêu cầu hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn duyệt yêu cầu hoàn tiền này không? Yêu cầu
                sẽ được chuyển sang trạng thái &quot;Đã duyệt&quot; và có thể
                thực hiện hoàn tiền.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenApprove(false)}>
                Hủy
              </Button>
              <Button onClick={handleApprove}>Xác nhận duyệt</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Confirmation Dialog */}
      {openReject && (
        <Dialog open={openReject} onOpenChange={setOpenReject}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận từ chối yêu cầu hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn từ chối yêu cầu hoàn tiền này không? Thao
                tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenReject(false)}>
                Hủy
              </Button>
              <Button variant="destructive" onClick={handleReject}>
                Xác nhận từ chối
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Refund Confirmation Dialog */}
      {openRefund && (
        <Dialog open={openRefund} onOpenChange={setOpenRefund}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Xác nhận hoàn tiền</DialogTitle>
              <DialogDescription>
                Bạn có chắc chắn muốn hoàn tiền cho yêu cầu này không? Số tiền{" "}
                <strong>{formatCurrency(refundRequest.amount)}</strong> sẽ được
                hoàn lại cho khách hàng. Thao tác này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenRefund(false)}>
                Hủy
              </Button>
              <Button onClick={handleRefund}>Xác nhận hoàn tiền</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
