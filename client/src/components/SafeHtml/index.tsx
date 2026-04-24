import DOMPurify from 'dompurify';
import { Box, type BoxProps } from '@mui/material';

interface Props extends BoxProps {
  html: string;
}

export default function SafeHtml({ html, sx, ...props }: Props) {
  // 1. Làm sạch HTML trước khi render
  const cleanHtml = DOMPurify.sanitize(html);

  return (
    <Box
      {...props}
      sx={{
        // CSS mặc định để nội dung HTML hiển thị đẹp (vì HTML thô thường chưa có style)
        '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
        '& ul, & ol': { pl: 3 },
        '& p': { mb: 1, lineHeight: 1.6 },
        '& h1, & h2, & h3': { mt: 2, mb: 1, fontWeight: 700 },
        // Gộp với sx truyền từ ngoài vào
        ...sx 
      }}
      // 2. Render an toàn
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}