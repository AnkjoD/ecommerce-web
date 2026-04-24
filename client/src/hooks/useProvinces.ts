import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export interface Ward {
  name: string
  code: number
}

export interface District {
  name: string
  code: number
  wards: Ward[]
}

export interface Province {
  name: string
  code: number
  districts: District[]
}

export default function useProvinces() {
  return useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await axios.get<Province[]>('https://provinces.open-api.vn/api/?depth=3')
      return response.data
    },
    staleTime: Infinity, // Dữ liệu tỉnh/thành phố hiếm khi thay đổi nên cache vĩnh viễn trong session
    retry: 3
  })
}
