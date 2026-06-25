import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChatService } from '../chat.service';
import { AtGuard } from '../../auth/guards/at.guard';
import { GetCurrentUser } from '@/common/decorators';

@ApiTags('AI - Chat')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * POST /api/chat/completions
   * Gửi tin nhắn đến AI Chatbot — bắt buộc phải đăng nhập.
   */
  @Post('completions')
  async chatCompletion(
    @GetCurrentUser('sub') userId: string,
    @Body('message') message: string,
    @Body('chat_history') chatHistory: any[] = [],
  ) {
    return this.chatService.chatCompletion(userId, message, chatHistory);
  }
}
