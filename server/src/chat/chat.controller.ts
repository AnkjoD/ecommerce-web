// chat/chat.controller.ts
//
// ⚠️  TÍNH NĂNG AI (ChatGPT + Vector Search) CHƯA ĐƯỢC KÍCH HOẠT
// ─────────────────────────────────────────────────────────────────
// Controller này đang được giữ lại cho cấu trúc, nhưng phần AI
// (OpenAI streaming, VectorSearch, BehaviorService) đã bị comment out
// trong chat.service.ts vì chưa cấu hình OpenAI API key và MongoDB.
//
// TODO: Khi ready, uncomment các phần AI trong chat.service.ts và bật lại.
// ─────────────────────────────────────────────────────────────────

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { Public } from '../auth/decorators/public.decorator';
import { AtGuard } from '../auth/guards/at.guard';
import { GetCurrentUserId } from '../common/decorators';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

/**
 * ChatController — Quản lý phiên chat AI với trợ lý mua sắm.
 *
 * Base URL: /api/chat
 *
 * LƯU Ý: Tính năng AI hiện chưa hoạt động do chưa kết nối OpenAI + MongoDB.
 * Xem chat.service.ts để biết chi tiết cần cấu hình thêm gì.
 */
@UseGuards(AtGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  /**
   * POST /api/chat/sessions
   * Tạo phiên chat mới.
   *
   * Input:  Không cần body. UserId lấy từ JWT nếu đã đăng nhập.
   * Output: ChatSession object { _id, user_id, messages: [], ... }
   * Auth:   ❌ Public — khách vãng lai cũng có thể chat
   *
   * userId là optional — nếu chưa đăng nhập thì session không gắn user.
   */
  @Public()
  @Post('sessions')
  createSession(
    // Dùng decorator custom để lấy userId từ JWT (nếu có token)
    // Nếu không có token → userId = undefined (vì route là Public)
    @GetCurrentUserId() userId: string | undefined,
  ) {
    // ✅ SỬA: JWT payload dùng 'sub' làm userId, không phải 'id'
    // req.user?.id là SAI — phải dùng req.user?.sub (xem JwtPayload interface)
    // Decorator @GetCurrentUserId() đã tự đọc từ req.user.sub nên dùng trực tiếp được
    return this.chatService.createSession(userId);
  }

  /**
   * POST /api/chat/sessions/:id/messages
   * Gửi tin nhắn vào phiên chat và nhận phản hồi AI theo dạng stream (SSE).
   *
   * Params: id — MongoDB ObjectId của ChatSession
   * Body:   { message: string }
   * Output: Server-Sent Events stream
   *         - Mỗi chunk AI trả ra: `data: {"delta": "..."}\n\n`
   *         - Kết thúc:            `data: {"done": true}\n\n`
   *         - Lỗi:                 `data: {"error": "..."}\n\n`
   * Auth:   ❌ Public — không cần đăng nhập để chat
   *
   * ⚠️ CHƯA HOẠT ĐỘNG: Cần cấu hình OPENAI_API_KEY và MongoDB connection.
   * Khi AI chưa sẵn sàng, response sẽ trả lỗi từ ChatService.
   */
  @Public()
  @Post('sessions/:id/messages')
  async streamMessage(
    @Param('id') sessionId: string,
    @Body('message') message: string,
    @Res() res: Response,
  ) {
    // Server-Sent Events — cho phép stream từng chunk thay vì trả 1 lần
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      // AsyncIterable — mỗi iteration là 1 chunk văn bản từ AI
      for await (const chunk of this.chatService.streamMessage(
        sessionId,
        message,
      )) {
        // SSE format: "data: <json>\n\n"
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      // Báo hiệu stream kết thúc
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err) {
      // Gửi lỗi về client qua SSE thay vì throw exception
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    } finally {
      res.end(); // Đóng connection
    }
  }

  /**
   * GET /api/chat/sessions/:id/history
   * Lấy lịch sử tin nhắn của một phiên chat.
   *
   * Params: id — MongoDB ObjectId của ChatSession
   * Output: { messages: Message[], context: object, resolved: boolean }
   * Auth:   ✅ Cần đăng nhập (để bảo vệ lịch sử chat)
   *
   * ⚠️ CHƯA HOẠT ĐỘNG: Cần kết nối MongoDB.
   */
  @Get('sessions/:id/history')
  getHistory(@Param('id') id: string) {
    return this.chatService.getHistory(id);
  }
}
