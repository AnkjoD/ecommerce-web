// chat/chat.service.ts
//
// ⚠️  TÍNH NĂNG AI CHƯA ĐƯỢC KÍCH HOẠT — ĐỌC TRƯỚC KHI DÙNG
// ─────────────────────────────────────────────────────────────────
// Service này dùng OpenAI GPT-4o-mini để trả lời chat và
// VectorSearchService để tìm sản phẩm liên quan theo semantic search.
//
// ĐỂ BẬT TÍNH NĂNG AI CẦN:
//   1. OPENAI_API_KEY trong .env
//   2. MongoDB đã kết nối (ChatSession schema lưu ở MongoDB)
//   3. VectorSearchService và BehaviorService đã được implement (xem src/ai/)
//   4. Uncomment import và inject ở phía dưới
//
// Hiện tại service trả về mock/empty data để tránh crash khi AI chưa sẵn sàng.
// ─────────────────────────────────────────────────────────────────

import { Injectable, NotFoundException } from '@nestjs/common';

// ── Import MongoDB (uncomment khi MongoDB đã được cấu hình) ──────────────────
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { ChatSession } from './schemas/chat-session.schema';

// ── Import OpenAI (uncomment khi có OPENAI_API_KEY) ──────────────────────────
// import OpenAI from 'openai';

// ── Import AI services (uncomment khi các service này đã được implement) ──────
// import { VectorSearchService } from '../ai/vector-search.service';
// import { BehaviorService } from '../ai/behavior.service';

// ─── Interfaces tạm thời (thay thế MongoDB schema khi chưa kết nối) ──────────

/** Một tin nhắn trong lịch sử chat */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/** Session chat (tạm lưu trong memory, sẽ chuyển sang MongoDB) */
export interface ChatSessionData {
  id: string;
  user_id: string | null;
  messages: ChatMessage[];
  /** Context lưu trạng thái hội thoại (sản phẩm đang xem, intent gần nhất, ...) */
  context: Record<string, unknown>;
  /** Lịch sử các intent/chủ đề đã hỏi */
  intent_history: string[];
  resolved: boolean;
  created_at: Date;
}

@Injectable()
export class ChatService {
  // ── In-memory store TẠM THỜI — sẽ thay bằng MongoDB khi connect ─────────────
  // Lý do không dùng Map thật: đây chỉ là stub để dev không crash
  // Production PHẢI dùng MongoDB để persistent và scale
  private _sessions = new Map<string, ChatSessionData>();

  // ── OpenAI instance (uncomment khi sẵn sàng) ─────────────────────────────────
  // private openai = new OpenAI(); // tự đọc OPENAI_API_KEY từ process.env

  /** System prompt mặc định cho trợ lý AI */
  private readonly SYSTEM_PROMPT = `Bạn là trợ lý tư vấn mua sắm thông minh.
Nhiệm vụ: giúp khách tìm sản phẩm phù hợp, so sánh, và trả lời câu hỏi.
Luôn trả lời bằng tiếng Việt. Ngắn gọn, thân thiện.
Nếu khách hỏi về sản phẩm cụ thể, hãy đề xuất thêm sản phẩm liên quan.`;

  constructor() {
    // ── Inject MongoDB model (uncomment khi MongoDB đã cấu hình) ──────────────
    // @InjectModel(ChatSession.name)
    // private chatSessionModel: Model<ChatSession>,
    //
    // ── Inject AI services (uncomment khi implement xong) ─────────────────────
    // private vectorSearchService: VectorSearchService,
    // private behaviorService: BehaviorService,
  }

  // ─── Tạo session chat ────────────────────────────────────────────────────────

  /**
   * Tạo phiên chat mới.
   *
   * Input:  userId (optional — null nếu chưa đăng nhập)
   * Output: ChatSession object với messages rỗng
   *
   * TODO: Thay Map bằng MongoDB:
   *   return this.chatSessionModel.create({ user_id: userId, messages: [], ... });
   */
  async createSession(userId?: string): Promise<ChatSessionData> {
    const session: ChatSessionData = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      user_id: userId ?? null,
      messages: [],
      context: {},
      intent_history: [],
      resolved: false,
      created_at: new Date(),
    };
    this._sessions.set(session.id, session);
    return session;
  }

  // ─── Stream tin nhắn AI ──────────────────────────────────────────────────────

  /**
   * Gửi tin nhắn và nhận phản hồi AI dạng stream (chunk từng token).
   *
   * Input:  sessionId, userMessage
   * Output: AsyncIterable<string> — mỗi chunk là một đoạn text nhỏ từ AI
   *
   * ⚠️ CHƯA HOẠT ĐỘNG — cần OPENAI_API_KEY + MongoDB
   *
   * Khi đã sẵn sàng, uncomment toàn bộ logic trong method này và:
   * 1. Thay this._sessions.get() → await this.chatSessionModel.findById()
   * 2. Bỏ phần yield stub, dùng openai.chat.completions.create({ stream: true })
   * 3. Uncomment VectorSearchService để lấy sản phẩm liên quan
   *
   * Luồng đầy đủ khi AI sẵn sàng:
   * 1. Lấy session từ MongoDB
   * 2. Tìm sản phẩm liên quan qua vector search (semantic similarity)
   * 3. Build system prompt động (thêm context sản phẩm)
   * 4. Ghép history 10 tin nhắn gần nhất
   * 5. Stream từ OpenAI GPT-4o-mini
   * 6. Lưu response vào MongoDB
   * 7. Cập nhật context session
   */
  async *streamMessage(
    sessionId: string,
    userMessage: string,
  ): AsyncIterable<string> {
    // Kiểm tra session tồn tại (dùng memory store tạm thời)
    const session = this._sessions.get(sessionId);
    if (!session) throw new NotFoundException('Chat session không tồn tại');

    // Lưu tin nhắn người dùng
    session.messages.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // ── STUB: Trả về thông báo AI chưa sẵn sàng ──────────────────────────────
    // TODO: Thay thế block này bằng OpenAI streaming khi có OPENAI_API_KEY:
    //
    // const relatedProducts = await this.extractProductContext(userMessage);
    // const systemPrompt = this.buildSystemPrompt({ products: relatedProducts, ... });
    // const messages = [{ role: 'system', content: systemPrompt }, ...history, { role: 'user', content: userMessage }];
    // const stream = await this.openai.chat.completions.create({ model: 'gpt-4o-mini', messages, stream: true });
    // for await (const chunk of stream) {
    //   const delta = chunk.choices[0]?.delta?.content ?? '';
    //   if (delta) { fullResponse += delta; yield delta; }
    // }
    const stubResponse =
      '[AI chưa được cấu hình] Vui lòng thiết lập OPENAI_API_KEY trong .env để bật tính năng chat AI.';
    const words = stubResponse.split(' ');
    for (const word of words) {
      yield word + ' ';
      // Giả lập delay stream (remove khi dùng OpenAI thật)
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    // Lưu response
    session.messages.push({
      role: 'assistant',
      content: stubResponse,
      timestamp: new Date(),
    });
  }

  // ─── Lấy lịch sử chat ────────────────────────────────────────────────────────

  /**
   * Lấy lịch sử tin nhắn của một session.
   *
   * Input:  sessionId
   * Output: { messages: Message[], context: object, resolved: boolean }
   * Lỗi:   404 nếu session không tồn tại
   *
   * TODO: Thay Map bằng MongoDB:
   *   // return this.chatSessionModel.findById(sessionId).select('messages context resolved');
   */
  async getHistory(
    sessionId: string,
  ): Promise<Pick<ChatSessionData, 'messages' | 'context' | 'resolved'>> {
    const session = this._sessions.get(sessionId);
    if (!session) throw new NotFoundException('Chat session không tồn tại');
    return {
      messages: session.messages,
      context: session.context,
      resolved: session.resolved,
    };
  }

  // ─── Private AI helpers (sẽ uncomment khi AI sẵn sàng) ──────────────────────

  /**
   * Build system prompt động dựa trên context hiện tại của session.
   * Thêm thông tin sản phẩm liên quan vào prompt để AI trả lời chính xác hơn.
   *
   * TODO: Uncomment khi VectorSearchService sẵn sàng
   */
  // private buildSystemPrompt(ctx: {
  //   products: any[];
  //   intentHistory: string[];
  //   currentContext: any;
  // }): string {
  //   let prompt = this.SYSTEM_PROMPT;
  //   if (ctx.products.length > 0) {
  //     const productInfo = ctx.products.slice(0, 3)
  //       .map(p => `- ${p.name}: ${p.base_price?.toLocaleString('vi-VN')}đ — ${p.description?.short ?? ''}`)
  //       .join('\n');
  //     prompt += `\n\nSản phẩm liên quan đến câu hỏi:\n${productInfo}`;
  //   }
  //   if (ctx.intentHistory.length > 0) {
  //     prompt += `\n\nKhách đã hỏi về: ${ctx.intentHistory.slice(-3).join(', ')}`;
  //   }
  //   return prompt;
  // }

  /**
   * Tìm sản phẩm liên quan đến câu hỏi bằng vector similarity search.
   * Trả về [] nếu VectorSearch chưa sẵn sàng để không crash service.
   *
   * TODO: Uncomment khi VectorSearchService sẵn sàng
   */
  // private async extractProductContext(message: string): Promise<any[]> {
  //   try {
  //     return await this.vectorSearchService.similarByText(message, 3);
  //   } catch {
  //     return []; // Fallback — không crash nếu vector search lỗi
  //   }
  // }

  /**
   * Cập nhật context của session sau mỗi lượt chat.
   * Lưu sản phẩm vừa đề cập và giữ 10 intent gần nhất.
   *
   * TODO: Uncomment khi MongoDB sẵn sàng
   */
  // private async updateSessionContext(sessionId, message, products): Promise<void> {
  //   const update: any = { 'context.last_message_at': new Date() };
  //   if (products.length > 0) {
  //     update['context.last_products'] = products.map(p => p._id);
  //     update.$push = { intent_history: { $each: [message.slice(0, 60)], $slice: -10 } };
  //   }
  //   // await this.chatSessionModel.findByIdAndUpdate(sessionId, update);
  // }
}
