import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatService {
  /**
   * Gọi sang Python AI Sidecar
   */
  async chatCompletion(userId: string, message: string, chatHistory: any[] = []) {
    try {
      // Gọi sang FastAPI/Uvicorn backend chạy ở cổng 8000
      const response = await axios.post(
        'http://localhost:8000/chat/completions',
        {
          message: message,
          chat_history: chatHistory ?? [],
          user_id: userId,
          stream: false,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000, // 120s — model load có thể mất ~90s khi FastAPI restart
        },
      );

      // Kết quả mong đợi từ Python: { response: "...", products: [...], mode: "..." }
      return response.data;
    } catch (error) {
      const detail = error?.response?.data ?? error.message;
      console.error('[ChatService] AI Sidecar Error:', JSON.stringify(detail));
      throw new HttpException(
        'Hệ thống Chatbot AI hiện không phản hồi. Vui lòng thử lại sau.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

