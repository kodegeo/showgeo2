import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { ChatService } from "./chat.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { Public } from "../../common/decorators";
import { CurrentUser } from "../../common/decorators";

type User = { id?: string } | null;

@ApiTags("chat")
@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(":eventId")
  @Public()
  @ApiOperation({ summary: "Get last 50 messages for an event's chat" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 200, description: "List of messages" })
  @ApiResponse({ status: 404, description: "Event not found" })
  getMessages(@Param("eventId") eventId: string) {
    return this.chatService.getMessages(eventId);
  }

  @Post(":eventId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Send a message to an event's chat" })
  @ApiParam({ name: "eventId", type: String })
  @ApiResponse({ status: 201, description: "Message sent" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Event not found" })
  sendMessage(
    @Param("eventId") eventId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: User,
  ) {
    const userId = user?.id ?? null;
    return this.chatService.sendMessage(eventId, userId, dto);
  }
}
