import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  filterCategory: string;
  setFilterCategory: (value: string) => void;
  categories: any[];
  selectedIds: string[];
  filteredLength: number;
  onSelectAll: (checked: boolean) => void;
}

export default function ProductFilters({
  search,
  setSearch,
  filterStatus,
  setFilterStatus,
  filterCategory,
  setFilterCategory,
  categories,
  selectedIds,
  filteredLength,
  onSelectAll
}: ProductFiltersProps) {
  return (
    <div className="flex gap-3 flex-wrap items-center bg-card/50 p-2 rounded-2xl border border-border/40">
      <div className="relative flex-1 min-w-[300px]">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
        <Input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Tìm kiếm sản phẩm, SKU hoặc thương hiệu..." 
          className="pl-11 bg-background/50 border-none focus:ring-0 h-12 rounded-xl" 
        />
      </div>
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 bg-background/50 border-none h-12 rounded-xl text-xs font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="active">🟢 Đang hoạt động</SelectItem>
            <SelectItem value="draft">🟡 Bản nháp</SelectItem>
            <SelectItem value="low_stock">🟠 Sắp hết hàng (&lt; 5)</SelectItem>
            <SelectItem value="out_of_stock">🔴 Hết hàng (0)</SelectItem>
            <SelectItem value="archived">⚪ Lưu trữ</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 bg-background/50 border-none h-12 rounded-xl text-xs font-bold">
            <SelectValue placeholder="Theo danh mục" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 px-4 h-12 bg-background/50 rounded-xl border border-border/20">
           <input 
             type="checkbox" 
             className="w-4 h-4 rounded border-border accent-primary"
             checked={selectedIds.length === filteredLength && filteredLength > 0}
             onChange={(e) => onSelectAll(e.target.checked)}
           />
           <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Chọn tất cả</span>
        </div>
      </div>
    </div>
  );
}
