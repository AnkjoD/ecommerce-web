import { useState } from 'react';
import { useAdminAuditLogs } from '@/hooks/use-admin-resources';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, History } from 'lucide-react';

const actionColors: Record<string, string> = {
  create: 'bg-green-500/20 text-green-400',
  update: 'bg-blue-500/20 text-blue-400',
  delete: 'bg-red-500/20 text-red-400',
  status_change: 'bg-yellow-500/20 text-yellow-400',
};

const entityLabels: Record<string, string> = {
  product: 'Sản phẩm',
  category: 'Danh mục',
  coupon: 'Mã giảm giá',
  order: 'Đơn hàng',
  review: 'Đánh giá',
  variant: 'Biến thể',
  user: 'Người dùng',
};

function getActionColor(action: string) {
  const normAction = action.toLowerCase();
  if (normAction.includes('create') || normAction.includes('add')) return actionColors.create;
  if (normAction.includes('update') || normAction.includes('edit')) return actionColors.update;
  if (normAction.includes('delete') || normAction.includes('remove')) return actionColors.delete;
  return actionColors.status_change;
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data: logsData, isLoading } = useAdminAuditLogs(page, 50);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');

  const logs = logsData?.data || [];
  const filtered = logs.filter((log: any) => {
    const matchSearch = search === '' ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.entity_id || '').toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(search.toLowerCase());
    const matchEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    return matchSearch && matchEntity;
  });

  const entityTypes = [...new Set(logs.map((l: any) => l.entity_type))];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold font-display gradient-text flex items-center gap-2">
            <History size={24} /> Nhật ký hệ thống
          </h2>
          <p className="text-muted-foreground text-sm">Giám sát hoạt động vận hành</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input 
            placeholder="Tìm kiếm hành động, ID..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="pl-9 bg-muted/30 border-border focus:ring-primary/20" 
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px] bg-muted/30 border-border">
            <SelectValue placeholder="Loại đối tượng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả đối tượng</SelectItem>
            {entityTypes.map((et: any) => (
              <SelectItem key={et} value={et}>{entityLabels[et] || et}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card border-border overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-muted/20">
                <TableHead className="w-[180px]">Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Đang tải nhật ký...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">Không tìm thấy bản ghi nào</TableCell></TableRow>
              ) : filtered.map((log: any) => (
                <TableRow key={log.id} className="border-border hover:bg-muted/10 transition-colors">
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{log.user?.full_name || 'Hệ thống'}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{log.user?.email || 'System'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`${getActionColor(log.action)} border-none text-[10px] uppercase font-bold px-2`}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-foreground">
                        {entityLabels[log.entity_type] || log.entity_type}
                      </span>
                      {log.entity_id && (
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                           ID: {log.entity_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[400px]">
                    <p className="text-xs text-muted-foreground break-words line-clamp-2 hover:line-clamp-none transition-all cursor-default">
                      {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0
                        ? Object.entries(log.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')
                        : 'Không có chi tiết'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-between items-center text-sm text-muted-foreground px-2">
        <span>Hiển thị {filtered.length} bản ghi</span>
        <div className="flex gap-2">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 bg-muted/30 rounded border border-border disabled:opacity-30"
          >
            Trước
          </button>
          <span className="px-3 py-1 bg-primary/10 text-primary rounded border border-primary/20">Trang {page}</span>
          <button 
            disabled={logs.length < 50} 
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 bg-muted/30 rounded border border-border disabled:opacity-30"
          >
            Tiếp
          </button>
        </div>
      </div>
    </div>
  );
}
