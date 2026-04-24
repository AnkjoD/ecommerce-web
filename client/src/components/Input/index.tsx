import { FormLabel, TextField } from "@mui/material";
import type {TextFieldProps} from '@mui/material'
import type {FieldValues, UseFormRegister, Path} from 'react-hook-form'

interface InputProp<T extends FieldValues> extends Omit<TextFieldProps, 'label'>{
    type: string,
    error: boolean,
    helperText: string | undefined,
    placeholder: string,
    label: string,
    register: UseFormRegister<T>,
    name: Path<T>,
    props?: TextFieldProps;
}
function Input<T extends FieldValues>({label,name,  error, helperText, placeholder, type,register, props}: InputProp<T>) {
    return(
        <div>
            <FormLabel>{label}</FormLabel>
            <TextField
                autoFocus
                variant="outlined"
                fullWidth
                type={type}
                placeholder={placeholder}
                error={error}
                helperText={helperText}
                {...register(name)}
                {...props}
            />
        </div>
    )
}

export default Input;