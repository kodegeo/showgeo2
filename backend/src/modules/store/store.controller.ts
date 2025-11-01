import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { StoreService } from "./store.service";
import { CreateStoreDto, UpdateStoreDto, CreateProductDto, UpdateProductDto, StoreQueryDto } from "./dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Public } from "../../common/decorators/public.decorator";
import { User, UserRole } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@ApiTags("stores")
@Controller("stores")
export class StoreController {
  constructor(
    private readonly storeService: StoreService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ENTITY", "ADMIN")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a new store (Entity or Admin)" })
  @ApiResponse({ status: 201, description: "Store created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Entity or Admin only" })
  @ApiResponse({ status: 409, description: "Store with this slug already exists" })
  async create(@Body() createStoreDto: CreateStoreDto, @CurrentUser() user: User) {
    // Find user's first owned entity
    // In production, you might want to allow selecting which entity or make entityId required in DTO
    const ownedEntities = await this.prisma.entity.findMany({
      where: { ownerId: user.id },
      take: 1,
    });

    if (ownedEntities.length === 0 && user.role !== UserRole.ADMIN) {
      throw new BadRequestException("User must own at least one entity to create a store");
    }

    const entityId = ownedEntities[0]?.id;

    if (!entityId && user.role !== UserRole.ADMIN) {
      throw new BadRequestException("Entity ID required for store creation");
    }

    return this.storeService.createStore(createStoreDto, entityId);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: "Browse all stores (public)" })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "entityId", required: false, type: String })
  @ApiQuery({ name: "eventId", required: false, type: String })
  @ApiQuery({ name: "tourId", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ["ACTIVE", "INACTIVE", "ARCHIVED"] })
  @ApiQuery({ name: "visibility", required: false, enum: ["PUBLIC", "UNLISTED", "PRIVATE"] })
  @ApiQuery({ name: "isActive", required: false, type: Boolean })
  @ApiQuery({ name: "tag", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of stores" })
  findAll(@Query() query: StoreQueryDto) {
    return this.storeService.findAll(query);
  }

  @Get(":id")
  @Public()
  @ApiOperation({ summary: "Get store details (public)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Store details with products" })
  @ApiResponse({ status: 404, description: "Store not found" })
  findOne(@Param("id") id: string) {
    return this.storeService.findOne(id);
  }

  @Get("entity/:entityId")
  @Public()
  @ApiOperation({ summary: "Get stores by entity (public)" })
  @ApiParam({ name: "entityId", type: String })
  @ApiResponse({ status: 200, description: "List of stores for entity" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  getEntityStore(@Param("entityId") entityId: string) {
    return this.storeService.getEntityStore(entityId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update store (Owner or Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Store updated successfully" })
  @ApiResponse({ status: 404, description: "Store not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Manager only" })
  update(@Param("id") id: string, @Body() updateStoreDto: UpdateStoreDto, @CurrentUser() user: User) {
    return this.storeService.updateStore(id, updateStoreDto, user.id, user.role);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete store (Owner or Admin)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Store deleted successfully" })
  @ApiResponse({ status: 404, description: "Store not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Admin only" })
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.storeService.delete(id, user.id, user.role);
  }

  @Post(":id/products")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Add product to store (Owner or Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 201, description: "Product added successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Manager only" })
  @ApiResponse({ status: 404, description: "Store not found" })
  addProduct(
    @Param("id") storeId: string,
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: User,
  ) {
    return this.storeService.addProduct(storeId, createProductDto, user.id, user.role);
  }

  @Patch("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update product (Owner or Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 200, description: "Product updated successfully" })
  @ApiResponse({ status: 404, description: "Product not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Manager only" })
  updateProduct(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto, @CurrentUser() user: User) {
    return this.storeService.updateProduct(id, updateProductDto, user.id, user.role);
  }

  @Delete("products/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete product (Owner or Manager)" })
  @ApiParam({ name: "id", type: String })
  @ApiResponse({ status: 204, description: "Product deleted successfully" })
  @ApiResponse({ status: 404, description: "Product not found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - Owner or Manager only" })
  removeProduct(@Param("id") id: string, @CurrentUser() user: User) {
    return this.storeService.removeProduct(id, user.id, user.role);
  }
}

