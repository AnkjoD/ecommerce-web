import {  useEffect} from 'react';
import { Dialog, Typography, Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface Props {
  open: boolean;
  message: string;
  onClose: () => void;
  autoHideDuration?: number;

}

export default function SuccessMessage({ 
  open, 
  onClose, 
  message, 
  
  autoHideDuration = 1500 
}: Props) {
  
  

  // 3. Logic Timer
  useEffect(() => {
    if (open && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
        
      }, autoHideDuration);
      
      return () => clearTimeout(timer);
    }
  }, [open, autoHideDuration, onClose]); 


  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          bgcolor: 'rgba(0,0,0,0.7)',
          color: 'white',
          borderRadius: 2,
          boxShadow: 'none',
          minWidth: 200,
          p: 3
        }
      }}
    >
      <Stack alignItems="center" spacing={1.5}>
        <CheckCircleOutlineIcon sx={{ fontSize: 60, color: '#00e676' }} />
        <Typography variant="body1" fontWeight={500}>
          {message}
        </Typography>
      </Stack>
    </Dialog>
  );
}