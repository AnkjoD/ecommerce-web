import { Box } from '@mui/material'
import ProfileForm from './ProfileForm' // Import cái form phức tạp vào

export default function ProfilePage() {
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <ProfileForm />
    </Box>
  )
}
