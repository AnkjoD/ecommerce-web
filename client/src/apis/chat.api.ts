import axios from 'axios'
import http from '~/utils/http'
import { type SuccessResponseApi } from '~/types/utils.type'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
  products: any[]
  mode: string
}

// Instance riêng cho chat — timeout 90s vì AI cần thời gian suy luận
const chatHttp = axios.create({
  baseURL: '/api',
  timeout: 90000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-HM-Secure': 'true'
  }
})

const chatApi = {
  /**
   * Gọi Chatbot AI Sidecar thông qua proxy NestJS
   */
  chatCompletion(message: string, chatHistory: ChatMessage[] = []) {
    return chatHttp.post<SuccessResponseApi<ChatResponse>>('/chat/completions', {
      message,
      chat_history: chatHistory
    })
  }
}

export default chatApi

