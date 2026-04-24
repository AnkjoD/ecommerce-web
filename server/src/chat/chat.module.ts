import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './controllers/chat.controller';

@Module({
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
