import { useState } from 'react';
import { Plus, X, FolderTree, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useAdminCategories, 
  useCreateCategory, 
  useDeleteCategory 
} from '@/hooks/use-admin-resources';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const addCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    
    addCategory.mutate({ name, parent_id: parentId }, {
      onSuccess: () => { 
        setNewName(''); 
        setParentId(null); 
      }
    });
  };

  const rootCategories = categories.filter((c: any) => !c.parent_id);

  // Helper to get nested level for indentation in Select
  const getLevel = (id: string | null, depth = 0): number => {
    if (!id) return depth;
    const cat = categories.find((c: any) => c.id === id);
    if (!cat || !cat.parent_id) return depth;
    return getLevel(cat.parent_id, depth + 1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-display gradient-text">Danh mục</h1>
        <p className="text-muted-foreground mt-1">Quản lý cấu trúc phân loại sản phẩm đa cấp</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-border flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Tên danh mục mới</label>
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="VD: Quần Jean Nam..."
            className="bg-muted/30 border-border h-11"
          />
        </div>
        <div className="w-full md:w-64 space-y-2">
          <label className="text-xs font-bold text-muted-foreground uppercase ml-1">Danh mục cha</label>
          <Select value={parentId || 'root'} onValueChange={v => setParentId(v === 'root' ? null : v)}>
            <SelectTrigger className="bg-muted/30 border-border h-11">
              <SelectValue placeholder="Chọn danh mục cha" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border max-h-80">
              <SelectItem value="root">Danh mục gốc (Gốc)</SelectItem>
              {categories.map((c: any) => {
                const depth = getLevel(c.parent_id);
                return (
                  <SelectItem key={c.id} value={c.id}>
                    {'\u00A0'.repeat(depth * 4)}{depth > 0 ? '↳ ' : ''}{c.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} className="h-11 px-8 gap-2 shadow-lg shadow-primary/20" disabled={addCategory.isPending}>
          <Plus size={18} /> {addCategory.isPending ? 'Đang tạo...' : 'Tạo mới'}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Đang tải cấu trúc...
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {rootCategories.length === 0 ? (
              <div className="text-center py-20 glass-card rounded-2xl border-dashed border-2 border-border">
                <FolderTree size={48} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">Chưa có danh mục nào. Hãy tạo danh mục đầu tiên!</p>
              </div>
            ) : rootCategories.map((cat: any) => (
              <CategoryNode 
                key={cat.id} 
                category={cat} 
                allCategories={categories} 
                onDelete={(id, name) => {
                  if (confirm(`Xóa danh mục "${name}" và toàn bộ con?`)) deleteCategory.mutate(id);
                }}
                depth={0}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function CategoryNode({ category, allCategories, onDelete, depth }: { 
  category: any; 
  allCategories: any[]; 
  onDelete: (id: string, name: string) => void;
  depth: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = allCategories.filter((c: any) => c.parent_id === category.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-2"
    >
      <div 
        className={`glass-card rounded-2xl p-4 flex items-center justify-between group border transition-all shadow-sm ${
          depth === 0 ? 'border-border/50 hover:border-primary/30 p-5' : 'border-border/20 ml-8 hover:border-primary/20'
        }`}
      >
        <div className="flex items-center gap-4 flex-1">
          {children.length > 0 ? (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all ${isExpanded ? 'rotate-90 text-primary bg-primary/10' : 'text-muted-foreground bg-muted'}`}
            >
              <ChevronRight size={14} />
            </button>
          ) : (
            <div className="w-6 h-px bg-muted-foreground/20 ml-0" />
          )}
          
          <div className={`flex items-center gap-3 ${depth === 0 ? '' : 'text-sm'}`}>
            <div className={`rounded-xl flex items-center justify-center text-primary shadow-inner ${
              depth === 0 ? 'w-10 h-10 bg-primary/10' : 'w-8 h-8 bg-primary/5'
            }`}>
              <FolderTree size={depth === 0 ? 20 : 16} />
            </div>
            <div>
              <h3 className={`font-bold text-foreground leading-tight ${depth === 0 ? 'text-lg' : 'text-base'}`}>
                {category.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">{category.slug}</code>
                {children.length > 0 && (
                  <span className="text-[9px] font-bold uppercase text-primary/60">
                    {children.length} con
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => onDelete(category.id, category.name)}
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all border border-transparent hover:border-destructive/20"
        >
          <X size={16} />
        </button>
      </div>

      {isExpanded && children.length > 0 && (
        <div className="space-y-2 relative border-l border-border/20 ml-5 pl-3">
          {children.map((child: any) => (
            <CategoryNode 
              key={child.id} 
              category={child} 
              allCategories={allCategories} 
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

