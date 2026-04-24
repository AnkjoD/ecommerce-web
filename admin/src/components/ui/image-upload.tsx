import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  bucket?: string;
  folder?: string;
  value?: string;
  onChange: (url: string | null) => void;
  className?: string;
}

export default function ImageUpload({ bucket = 'product-images', folder = 'products', value, onChange, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ chấp nhận file ảnh');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 5MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/upload?folder=${folder}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload thất bại');
      }

      const data = await response.json();
      onChange(data.url);
      toast.success('Upload thành công!');
    } catch (err: any) {
      toast.error('Lỗi upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => onChange(null)}
            className="absolute top-1 right-1 p-1 rounded-full bg-background/80 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
          {uploading ? (
            <span className="text-xs text-muted-foreground animate-pulse">Đang tải...</span>
          ) : (
            <>
              <Image size={20} className="text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground">Upload</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}
