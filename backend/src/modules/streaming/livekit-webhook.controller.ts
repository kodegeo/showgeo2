import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Public } from "../../common/decorators";
import { StreamingService } from "./streaming.service";

/**
 * LiveKit server webhooks (no JWT). Configure URL in LiveKit project:
 * POST /api/webhooks/livekit
 */
@ApiExcludeController()
@Controller("webhooks/livekit")
export class LivekitWebhookController {
  private readonly logger = new Logger(LivekitWebhookController.name);

  constructor(private readonly streamingService: StreamingService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: Record<string, unknown>) {
    const type = typeof body?.event === "string" ? body.event : "";
    const room = body?.room as { name?: string } | undefined;
    const roomName = typeof room?.name === "string" ? room.name : undefined;

    try {
      switch (type) {
        case "room_finished":
          await this.streamingService.handleRoomEnded(roomName);
          break;
        case "participant_left":
          await this.streamingService.handleParticipantLeft(roomName);
          break;
        default:
          break;
      }
    } catch (err) {
      this.logger.warn(
        `LiveKit webhook handler error (${type}): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    return { ok: true };
  }
}
