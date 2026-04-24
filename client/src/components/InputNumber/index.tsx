import { Box, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

interface InputNumberProps {
  max: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function InputNumber({ max, value, onChange, disabled }: InputNumberProps) {
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let val = Number(event.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > max) val = max;
    onChange(val);
  };

  const increase = () => {
    if (value < max) onChange(value + 1);
  };

  const decrease = () => {
    if (value > 1) onChange(value - 1);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <IconButton onClick={decrease} disabled={value <= 1 || disabled} size="small" sx={{ borderRadius: 0, px: 1 }}>
        <RemoveIcon fontSize="small" />
      </IconButton>
      
      <TextField
        value={value}
        onChange={handleChange}
        variant="standard"
        InputProps={{ disableUnderline: true }}
        inputProps={{ 
            style: { textAlign: 'center', width: 40, fontSize: 14 },
            type: 'number' 
        }}
        sx={{
        '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': {
          WebkitAppearance: 'none',
          margin: 0   // or shorthand m: 0 is fine in MUI
        }
      }}

      />
      
      <IconButton onClick={increase} disabled={value >= max || disabled} size="small" sx={{ borderRadius: 0, px: 1 }}>
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}