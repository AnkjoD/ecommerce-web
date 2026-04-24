import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SmartAttributePopoverProps {
  onAdd: (key: string) => void;
  existingKeys: string[];
}

export default function SmartAttributePopover({ onAdd, existingKeys }: SmartAttributePopoverProps) {
  const [key, setKey] = useState('');
  const [open, setOpen] = useState(false);
  
  const suggestions = ['Màu sắc', 'Dung lượng', 'Kích thước', 'Bảo hành', 'RAM', 'CPU', 'Bộ nhớ', 'Vật liệu'].filter(s => !existingKeys.includes(s));
  const productKeys = existingKeys;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 text-[9px] px-3 text-primary hover:bg-primary/10 transition-all font-black group bg-primary/5 rounded-full border border-primary/10">
          <Plus size={12} className="mr-1.5 group-hover:rotate-90 transition-transform" /> TẠO THUỘC TÍNH
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 bg-card border-border shadow-[0_20px_60px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 rounded-2xl z-[100]">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Tên trường kĩ thuật</h4>
            <Input 
              placeholder="VD: Chipset, Panel..." 
              value={key} 
              onChange={e => setKey(e.target.value)}
              className="h-10 text-xs bg-muted/20 border-none rounded-xl"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && key.trim()) {
                  onAdd(key.trim());
                  setKey('');
                  setOpen(false);
                }
              }}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] text-muted-foreground font-black opacity-30 uppercase tracking-widest">Gợi ý xu hướng</Label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[...new Set([...productKeys, ...suggestions])].slice(0, 12).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onAdd(s);
                    setOpen(false);
                  }}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all font-black border border-border/30"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          
          <Button 
            size="sm" 
            className="w-full h-10 text-xs font-black rounded-xl uppercase tracking-widest" 
            disabled={!key.trim()} 
            onClick={() => {
              onAdd(key.trim());
              setKey('');
              setOpen(false);
            }}
          >
            Tích hợp
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
