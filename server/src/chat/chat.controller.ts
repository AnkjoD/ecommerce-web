import {
  Controller,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AtGuard } from '../auth/guards/at.guard';
import { GetCurrentUserId } from '../common/decorators';

@UseGuards(AtGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat/completions
   * Gửi tin nhắn đến AI Chatbot. Yêu cầu đăng nhập.
   *
   * Body:   { message: string, chat_history: any[] }
   * Output: JSON response từ AI
   * Auth:   ✅ Bắt buộc đăng nhập
   */
  @Post('completions')
  async chatCompletion(
    @GetCurrentUserId() userId: string,
    @Body('message') message: string,
    @Body('chat_history') chatHistory: any[] = [],
  ) {
    return this.chatService.chatCompletion(userId, message, chatHistory);
  }
}
