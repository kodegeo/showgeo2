import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { ClipsService } from "./clips.service";
import { CreateClipDto, ShareClipDto } from "./clips.dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { CurrentUser } from "../../common/decorators";
import { Public } from "../../common/decorators";
import { app_users } from "@prisma/client";

type User = app_users;

@ApiTags("clips")
@Controller("clips")
export class ClipsController {
  constructor(private readonly clipsService: ClipsService) {}

  @Get("trending")
  @Public()
  @ApiOperation({ summary: "Get trending clips (by views)" })
  @ApiResponse({ status: 200, description: "List of trending clips for feed" })
  getTrending() {
    return this.clipsService.getTrending();
  }

  @Get(":clipId")
  @Public()
  @ApiOperation({ summary: "Get a clip by ID (increments view count)" })
  @ApiParam({ name: "clipId", type: String })
  @ApiResponse({ status: 200, description: "Clip with event and creator info" })
  @ApiResponse({ status: 404, description: "Clip not found" })
  getClip(@Param("clipId") clipId: string) {
    return this.clipsService.getClip(clipId);
  }

  @Delete(":clipId")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a clip (creator only)" })
  @ApiParam({ name: "clipId", type: String })
  @ApiResponse({ status: 204, description: "Clip deleted" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Clip not found" })
  async deleteClip(@Param("clipId") clipId: string, @CurrentUser() user: User) {
    assertFullUser(user);
    await this.clipsService.deleteClip(clipId, user.id);
  }

  @Post(":clipId/share")
  @Public()
  @ApiOperation({ summary: "Get share metadata for a clip" })
  @ApiParam({ name: "clipId", type: String })
  @ApiResponse({ status: 200, description: "Share URL, caption, hashtags, share links" })
  @ApiResponse({ status: 404, description: "Clip not found" })
  getShareMetadata(
    @Param("clipId") clipId: string,
    @Body() dto?: ShareClipDto,
  ) {
    return this.clipsService.getShareMetadata(clipId, dto);
  }
}
