import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatService } from '../chat.service';
import { Public } from '../../auth/decorators/public.decorator';
import { AtGuard } from '../../auth/guards/at.guard';
import { GetCurrentUser } from '@/common/decorators';

@ApiTags('AI - Chat')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Public()
  @Post('sessions')
  createSession(@GetCurrentUser('id') userId: string | undefined) {
    return this.chatService.createSession(userId);
  }

  @Public()
  @Post('sessions/:id/messages')
  async streamMessage(
    @Param('id') sessionId: string,
    @Body('message') message: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.chatService.streamMessage(
        sessionId,
        message,
      )) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      res.end();
    }
  }

  @ApiBearerAuth('access-token')
  @Get('sessions/:id/history')
  getHistory(@Param('id') id: string) {
    return this.chatService.getHistory(id);
  }
}
