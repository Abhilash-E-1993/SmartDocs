import { api } from '@/lib/axios'
import type { ApiSuccess } from '@/types/api'
import type { User } from '@/types/user'

export const authService = {
  async getMe(): Promise<User> {
    const { data } = await api.get<ApiSuccess<User>>('/auth/me')
    return data.data
  },
}
