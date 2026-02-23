'use client';

import { useState } from 'react';
import { AuditLogViewer } from '@/components/audit-log-viewer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { IconRefresh } from '@tabler/icons-react';
import { useDebounce } from '@/hooks/use-debounce';

export function AuditLogsContent() {
  const [activeTab, setActiveTab] = useState('all');
  const [entityId, setEntityId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Debounce entity ID search (500ms delay)
  const debouncedEntityId = useDebounce(entityId, 300);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bộ Lọc</CardTitle>
              <CardDescription>Lọc nhật ký theo loại hành động hoặc ID</CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <IconRefresh className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="entity-id">Tìm theo ID (Booking, Refund, Room, Payment)</Label>
              <Input
                id="entity-id"
                placeholder="Nhập ID để tìm kiếm..."
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                className='mt-2'
              />
              {entityId && entityId !== debouncedEntityId && (
                <p className="text-xs text-muted-foreground mt-1">Đang tìm kiếm...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Tất cả</TabsTrigger>
          <TabsTrigger value="booking">Booking</TabsTrigger>
          <TabsTrigger value="refund">Hoàn tiền</TabsTrigger>
          <TabsTrigger value="price">Đổi giá</TabsTrigger>
          <TabsTrigger value="payment">Thanh toán</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tất cả nhật ký</CardTitle>
              <CardDescription>Hiển thị tất cả các hành động trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer 
                key={`all-${refreshKey}-${debouncedEntityId}`}
                entityId={debouncedEntityId || undefined}
                limit={100} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký Booking</CardTitle>
              <CardDescription>Các thay đổi liên quan đến đơn đặt phòng</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer 
                key={`booking-${refreshKey}-${debouncedEntityId}`}
                entityType="booking"
                entityId={debouncedEntityId || undefined}
                limit={100} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="refund" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký Hoàn tiền</CardTitle>
              <CardDescription>Các yêu cầu hoàn tiền được duyệt hoặc từ chối</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer 
                key={`refund-${refreshKey}-${debouncedEntityId}`}
                entityType="refund"
                entityId={debouncedEntityId || undefined}
                limit={100} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký Đổi giá</CardTitle>
              <CardDescription>Các thay đổi giá phòng</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer 
                key={`room-${refreshKey}-${debouncedEntityId}`}
                entityType="room"
                entityId={debouncedEntityId || undefined}
                limit={100} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Nhật ký Thanh toán</CardTitle>
              <CardDescription>Các thay đổi trạng thái thanh toán</CardDescription>
            </CardHeader>
            <CardContent>
              <AuditLogViewer 
                key={`payment-${refreshKey}-${debouncedEntityId}`}
                entityType="payment"
                entityId={debouncedEntityId || undefined}
                limit={100} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
