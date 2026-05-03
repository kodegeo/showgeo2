import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { ToursService } from "./tours.service";
import { CreateTourDto, UpdateTourDto, TourQueryDto } from "./dto";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators";
import { Public } from "../../common/decorators";
import { assertFullUser } from "../../common/guards/assert-full-user";
import { CurrentUser } from "../../common/decorators";

type User = { id: string; role?: string };

@ApiTags("tours")
@Controller("tours")
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "List tours with optional filters" })
  @ApiQuery({ name: "entityId", required: false, type: String })
  @ApiQuery({ name: "includeEvents", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "List of tours" })
  findAll(@Query() query: TourQueryDto) {
    return this.toursService.findAll(query);
  }

  @Get("slug/:slug")
  @Public()
  @ApiOperation({ summary: "Get a tour by slug" })
  @ApiParam({ name: "slug", type: String })
  @ApiQuery({ name: "includeEvents", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Tour details" })
  @ApiResponse({ status: 404, description: "Tour not found" })
  findBySlug(
    @Param("slug") slug: string,
    @Query("includeEvents") includeEvents?: string,
  ) {
    const include = includeEvents === "true";
    return this.toursService.findBySlug(slug, include);
  }

  @Get(":id/events")
  @Public()
  @ApiOperation({ summary: "Get events for a tour" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "List of events" })
  @ApiResponse({ status: 404, description: "Tour not found" })
  getEvents(@Param("id") id: string) {
    return this.toursService.getEvents(id);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get a tour by ID" })
  @ApiParam({ name: "id", type: String })
  @ApiQuery({ name: "includeEvents", required: false, type: Boolean })
  @ApiResponse({ status: 200, description: "Tour details" })
  @ApiResponse({ status: 404, description: "Tour not found" })
  findOne(
    @Param("id") id: string,
    @Query("includeEvents") includeEvents?: string,
  ) {
    const include = includeEvents === "true";
    return this.toursService.findOne(id, include);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a tour" })
  @ApiResponse({ status: 201, description: "Tour created" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  @ApiResponse({ status: 409, description: "Tour name or slug already exists" })
  create(@Body() dto: CreateTourDto, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.toursService.create(dto);
  }

  @Patch(":id")
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update a tour" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Tour updated" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Tour not found" })
  @ApiResponse({ status: 409, description: "Tour name or slug already exists" })
  update(@Param("id") id: string, @Body() dto: UpdateTourDto, @CurrentUser() user: User) {
    assertFullUser(user);
    return this.toursService.update(id, dto);
  }
}
