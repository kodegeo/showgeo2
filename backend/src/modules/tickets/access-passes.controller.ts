import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AccessPassesService } from "./access-passes.service";
import { CreateAccessPassDto } from "./dto/create-access-pass.dto";
import { AccessPassByCodeQueryDto } from "./dto/access-pass-by-code.query";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";

type User = { id?: string } | null;

@ApiTags("access-passes")
@Controller("access-passes")
export class AccessPassesController {
  constructor(private readonly accessPassesService: AccessPassesService) {}

  @Get("by-code")
  @ApiOperation({ summary: "Look up an access pass by access_code" })
  @ApiResponse({ status: 200, description: "Access pass with ticket type and event" })
  @ApiResponse({ status: 404, description: "Not found" })
  getByCode(@Query() query: AccessPassByCodeQueryDto) {
    return this.accessPassesService.getAccessPassByCode(query.code);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create an access pass (event creator only)" })
  @ApiResponse({ status: 201, description: "Created access pass" })
  @ApiResponse({ status: 403, description: "Not the event creator" })
  @ApiResponse({ status: 404, description: "Event or ticket type not found" })
  create(
    @Body() body: CreateAccessPassDto,
    @CurrentUser() user: User,
  ) {
    assertFullUser(user);
    return this.accessPassesService.createAccessPass(body, user.id);
  }
}
