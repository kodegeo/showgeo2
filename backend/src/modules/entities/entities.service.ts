import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CreateEntityDto,
  UpdateEntityDto,
  AddCollaboratorDto,
  EntityQueryDto,
  CreatorApplicationDto,
} from "./dto";
import {
  EntityRoleType,
  UserRole,
  EntityType,
  Prisma,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";


type Entity = any;

// Define EntityStatus locally to match Prisma schema
type EntityStatus = "PENDING" | "APPROVED" | "REJECTED";
const EntityStatusEnum = {
  PENDING: "PENDING" as EntityStatus,
  APPROVED: "APPROVED" as EntityStatus,
  REJECTED: "REJECTED" as EntityStatus,
};

@Injectable()
export class EntitiesService {
  private readonly logger = new Logger(EntitiesService.name);
  private readonly supabase: SupabaseClient | null;
  private readonly supabaseBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Initialize Supabase client for file uploads
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn(
        "Supabase configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). Proof file uploads will fail.",
      );
      this.supabase = null;
    } else {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // Bucket name – can be overridden via env, defaults to "showgeo-assets"
    this.supabaseBucket = this.configService.get<string>("SUPABASE_STORAGE_BUCKET", "showgeo-assets");
  }

  async createEntity(createEntityDto: CreateEntityDto, ownerId: string): Promise<Entity> {
    const { slug, name } = createEntityDto;

    // Check if user is banned from entity applications (submission guard)
    const { EntityApplicationHelper } = await import("../../common/helpers/entity-application.helper");
    await EntityApplicationHelper.checkEntityApplicationEligibility(this.prisma, ownerId);

    // Check if slug already exists
    const existingEntity = await (this.prisma as any).entities.findUnique({
      where: { slug },
    });

    if (existingEntity) {
      throw new ConflictException("Entity with this slug already exists");
    }

    // Check if name already exists
    const existingByName = await (this.prisma as any).entities.findFirst({
      where: { name },
    });

    if (existingByName) {
      throw new ConflictException("Entity with this name already exists");
    }

    // Create entity with owner - ensure JSON fields are properly typed
    const { socialLinks, ...restDto } = createEntityDto;
    const createData: any = { ...restDto, ownerId };
    if (socialLinks !== undefined) {
      createData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    const entity = await (this.prisma as any).entities.create({
      data: {
        ...createData,
        // Create owner role automatically
        entity_roles: {
          create: {
            userId: ownerId,
            role: EntityRoleType.OWNER,
          },
        },
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity_roles: {
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
      },
    });

    return entity;
  }

  async updateEntity(
    id: string,
    updateEntityDto: UpdateEntityDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Entity> {
    const entity = await this.findOne(id);

    // Check permissions: Owner, Manager with ADMIN role, or Admin
    await this.checkUpdatePermissions(entity, userId, userRole);

    // Check slug uniqueness if being updated
    if (updateEntityDto.slug && updateEntityDto.slug !== entity.slug) {
      const existingEntity = await (this.prisma as any).entities.findUnique({
        where: { slug: updateEntityDto.slug },
      });

      if (existingEntity) {
        throw new ConflictException("Entity with this slug already exists");
      }
    }

    // Check name uniqueness if being updated
    if (updateEntityDto.name && updateEntityDto.name !== entity.name) {
      const existingEntity = await (this.prisma as any).entities.findFirst({
        where: { name: updateEntityDto.name },
      });

      if (existingEntity && existingEntity.id !== id) {
        throw new ConflictException("Entity with this name already exists");
      }
    }

    // Update entity - ensure JSON fields are properly typed
    const { socialLinks, ...restDto } = updateEntityDto;
    const updateData: any = { ...restDto };
    if (socialLinks !== undefined) {
      updateData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    try {
      const updated = await (this.prisma as any).entities.update({
        where: { id },
        data: updateData,
        include: {
          app_users: {
            select: {
              id: true,
              email: true,
              user_profiles: true,
            },
          },
          entity_roles: {
            include: {
              app_users: {
                select: {
                  id: true,
                  email: true,
                  user_profiles: true,
                },
              },
            },
          },
        },
      });

      return updated;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException("Entity not found");
      }
      throw error;
    }
  }

  async findAll(filters: {
    q?: string;
    genre?: string;
    verified?: string;
    hasEvents?: string;
    sort?: string;
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    isVerified?: boolean;
    isPublic?: boolean;
    location?: string;
    tag?: string;
  }) {
    const where: any = {};

    // Default: Only show public entities (backward compatible)
    if (filters.isPublic !== false) {
      where.isPublic = true;
    }

    const q = filters.q ?? filters.search;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ];
      if (filters.search) {
        where.OR.push(
          { bio: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        );
      }
    }

    const genre = filters.genre ?? filters.tag;
    if (genre) {
      where.tags = { has: genre };
    }

    if (filters.verified === "true" || filters.isVerified === true) {
      where.isVerified = true;
    }

    if (filters.hasEvents === "true") {
      where.events_events_entityIdToentities = {
        some: {
          startTime: { gte: new Date() },
        },
      };
    }

    if (filters.type) where.type = filters.type;
    if (filters.location) {
      where.location = { contains: filters.location, mode: "insensitive" };
    }

    const orderBy: any = {};
    switch (filters.sort) {
      case "newest":
        orderBy.createdAt = "desc";
        break;
      case "most_followed":
      case "trending":
        orderBy.follows = { _count: "desc" };
        break;
      default:
        orderBy.createdAt = "desc";
    }

    const page = filters.page ?? 1;
    const requestedLimit = filters.limit ?? 12;
    const limit = Math.min(requestedLimit, 50); // hard cap at 50
    const skip = (page - 1) * limit;
    const take = limit;
    
    const [data, total] = await this.prisma.$transaction([
      (this.prisma as any).entities.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          app_users: {
            select: {
              id: true,
              email: true,
              user_profiles: true,
            },
          },
          _count: {
            select: {
              events_events_entityIdToentities: true,
              tours_tours_primaryEntityIdToentities: true,
              stores_stores_entityIdToentities: true,
              follows: true,
            },
          },
        },
      }),
      (this.prisma as any).entities.count({ where }),
    ]);

    const pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
    return {
      data,
      pagination,
      meta: pagination, // backward compatible
    };
  }

  /**
   * Upload document to Supabase Storage
   * Returns the public URL of the uploaded file
   * 
   * Throws BadRequestException (400) on upload failures to prevent 500 errors
   * 
   * @param file The file to upload
   * @param userId The user ID (for organizing files)
   * @param subfolder Optional subfolder (e.g., "business-docs", "trademark-docs")
   */
  private async uploadDocumentFile(
    file: Express.Multer.File,
    userId: string,
    subfolder: string = "proof",
  ): Promise<string> {
    if (!this.supabase) {
      this.logger.error(`[CREATOR_APPLY] Supabase client not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`);
      throw new BadRequestException(
        "File upload service is not available. Please try again later."
      );
    }

    // Generate unique file path: creator-applications/{userId}/{subfolder}/{timestamp}-{filename}
    const timestamp = Date.now();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `creator-applications/${userId}/${subfolder}/${timestamp}-${sanitizedFilename}`;

      this.logger.debug(
        `[CREATOR_APPLY] Uploading ${subfolder} file: bucket="${this.supabaseBucket}", path="${filePath}", size=${file.size}`,
      );

    try {
      const { error } = await this.supabase.storage
        .from(this.supabaseBucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false, // Don't overwrite existing files
        });

      if (error) {
        // Log the real error for debugging
        this.logger.error(
          `[CREATOR_APPLY] Supabase upload error: ${error.message}. Bucket: ${this.supabaseBucket}`,
          error
        );
        
        // Return 400 instead of 500 for user-facing errors
        throw new BadRequestException(
          `File upload failed: ${error.message}. Please check the file and try again.`
        );
      }

      const {
        data: { publicUrl },
      } = this.supabase.storage.from(this.supabaseBucket).getPublicUrl(filePath);

      this.logger.debug(`[CREATOR_APPLY] ${subfolder} file uploaded successfully: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      // Re-throw BadRequestException as-is
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Catch any other errors (network, bucket missing, etc.)
      this.logger.error(
        `[CREATOR_APPLY] Unexpected upload error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new BadRequestException(
        "File upload failed. Please check the file and try again."
      );
    }
  }

  /**
   * Create a creator application (Entity with PENDING status)
   * Called when a user applies to become a creator
   * 
   * Supports optional document uploads:
   * - proofFile: General proof document
   * - businessDocFile: Business verification documents (EIN, LLC, etc.)
   * - trademarkDocFile: Trademark/IP verification documents
   * 
   * All uploaded files are stored in Supabase Storage and their URLs are stored in the proof field as JSON:
   * { proof: "url", businessDoc: "url", trademarkDoc: "url" }
   * 
   * Request type detection:
   * - JSON: application/json content type
   * - Multipart: multipart/form-data with optional files
   */
  async createCreatorApplication(
    applicationDto: CreatorApplicationDto,
    userId: string,
    proofFile?: Express.Multer.File,
    businessDocFile?: Express.Multer.File,
    trademarkDocFile?: Express.Multer.File,
  ): Promise<Entity> {
    // Log request type
    const hasFiles = proofFile || businessDocFile || trademarkDocFile;
    const requestType = hasFiles ? "multipart/form-data" : "application/json";
    this.logger.log(`[CREATOR_APPLY] Processing ${requestType} request for user ${userId}`);

    const {
      brandName,
      category,
      socialLinks,
      purpose,
      website,
      thumbnail,
      bannerImage,
      termsAccepted,
      phone,
    } = applicationDto;

    // Validate termsAccepted is explicitly true (normalized by DTO Transform)
    if (termsAccepted !== true) {
      this.logger.warn(`[CREATOR_APPLY] User ${userId} attempted to submit without accepting terms`);
      throw new BadRequestException(
        "You must accept the terms and conditions to submit a creator application."
      );
    }

    // Check if user is banned from entity applications (submission guard)
    const { EntityApplicationHelper } = await import("../../common/helpers/entity-application.helper");
    await EntityApplicationHelper.checkEntityApplicationEligibility(this.prisma, userId);

    // Check if user already has a pending application
    const existingPending = await (this.prisma as any).entities.findFirst({
      where: {
        ownerId: userId,
        status: EntityStatusEnum.PENDING,
      } as any, // Type assertion needed until Prisma client is fully regenerated
    });

    if (existingPending) {
      throw new BadRequestException(
        "You already have a pending creator application. Please wait for approval."
      );
    }

    // Generate slug
    const slug = this.generateSlug(brandName);

    // Check slug uniqueness
    const existingSlug = await (this.prisma as any).entities.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictException(
        "An entity with this brand name already exists. Please choose a different name."
      );
    }

    // Check brand name uniqueness
    const existingName = await (this.prisma as any).entities.findFirst({
      where: { name: brandName },
    });
    if (existingName) {
      throw new ConflictException(
        "An entity with this brand name already exists. Please choose a different name."
      );
    }

    // Fetch user to determine entity type
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: { user_profiles: true },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Determine entity type automatically
    const userDisplayName =
      user.user_profiles?.firstName && user.user_profiles?.lastName
        ? `${user.user_profiles.firstName} ${user.user_profiles.lastName}`
        : user.email.split("@")[0];

    const entityType =
      brandName.toLowerCase() !== userDisplayName.toLowerCase()
        ? EntityType.ORGANIZATION
        : EntityType.INDIVIDUAL;

    // Prepare creation data
    // Map 'purpose' from DTO to 'bio' field in Entity model
    const createData: any = {
      id: randomUUID(), // 👈 REQUIRED FOR PRISMA
      name: brandName,
      slug,
      ownerId: userId,
      type: entityType,
      status: EntityStatusEnum.PENDING,
      isPublic: false,
      bio: purpose, // Map purpose → bio
      tags: [category],
    };

    // Only include optional fields if they have values (avoid undefined in Prisma)
    if (website) {
      createData.website = website;
    }
    if (thumbnail) {
      createData.thumbnail = thumbnail;
    }
    if (bannerImage) {
      createData.bannerImage = bannerImage;
    }
    if (socialLinks !== undefined && socialLinks !== null) {
      createData.socialLinks = socialLinks as Prisma.InputJsonValue;
    }

    // Handle document uploads
    // Store all uploaded file URLs in a JSON object
    const proofObject: Record<string, string> = {};
    
    // Helper function to validate and upload a file
    const validateAndUploadFile = async (
      file: Express.Multer.File | undefined,
      fieldName: string,
      subfolder: string
    ): Promise<string | null> => {
      if (!file) return null;
      
      this.logger.debug(`[CREATOR_APPLY] ${fieldName} file provided: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);
      
      // Validate file type (allow common document types)
      const allowedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        this.logger.warn(`[CREATOR_APPLY] Invalid file type for ${fieldName}: ${file.mimetype}`);
        throw new BadRequestException(
          `Invalid file type for ${fieldName}. Allowed types: PDF, images (JPEG/PNG), Word documents, or text files.`
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        this.logger.warn(`[CREATOR_APPLY] File size exceeds limit for ${fieldName}: ${file.size} bytes`);
        throw new BadRequestException(
          `File size for ${fieldName} exceeds maximum allowed size of 10MB.`
        );
      }

      // Upload file to Supabase Storage
      const url = await this.uploadDocumentFile(file, userId, subfolder);
      this.logger.log(`[CREATOR_APPLY] ${fieldName} file uploaded successfully for user ${userId}: ${url}`);
      return url;
    };
    
    // Upload all provided files
    const proofUrl = await validateAndUploadFile(proofFile, "proof", "proof");
    const businessDocUrl = await validateAndUploadFile(businessDocFile, "businessDoc", "business-docs");
    const trademarkDocUrl = await validateAndUploadFile(trademarkDocFile, "trademarkDoc", "trademark-docs");
    
    // Build proof object with uploaded URLs
    if (proofUrl) proofObject.proof = proofUrl;
    if (businessDocUrl) proofObject.businessDoc = businessDocUrl;
    if (trademarkDocUrl) proofObject.trademarkDoc = trademarkDocUrl;
    
    // Always merge JSON proof from DTO (e.g., verificationPhone) with file URLs
    // This allows both file uploads and additional proof data to coexist
    if (applicationDto.proof) {
      let dtoProof: Record<string, any> = {};
      if (typeof applicationDto.proof === "string") {
        try {
          dtoProof = JSON.parse(applicationDto.proof);
          this.logger.debug(`[CREATOR_APPLY] Parsed proof JSON string: ${JSON.stringify(dtoProof)}`);
        } catch {
          // If parsing fails, treat as plain string
          dtoProof = { proof: applicationDto.proof };
          this.logger.debug(`[CREATOR_APPLY] Proof is plain string, wrapping in object`);
        }
      } else {
        dtoProof = applicationDto.proof;
        this.logger.debug(`[CREATOR_APPLY] Proof is object: ${JSON.stringify(dtoProof)}`);
      }
      // Merge DTO proof data into proofObject (file URLs take precedence if keys conflict)
      Object.assign(proofObject, dtoProof);
      // Restore file URLs if they were overwritten
      if (proofUrl) proofObject.proof = proofUrl;
      if (businessDocUrl) proofObject.businessDoc = businessDocUrl;
      if (trademarkDocUrl) proofObject.trademarkDoc = trademarkDocUrl;
      this.logger.debug(`[CREATOR_APPLY] Merged JSON proof from DTO with file URLs. Final proofObject: ${JSON.stringify(proofObject)}`);
    } else {
      this.logger.debug(`[CREATOR_APPLY] No proof data in DTO`);
    }
    
    // Convert proof object to JSON string for database storage
    const proofValue = Object.keys(proofObject).length > 0 ? JSON.stringify(proofObject) : null;

    // Create entity + owner role + entity application record
    // Wrap in transaction to ensure atomicity
    try {
      this.logger.debug(`[CREATOR_APPLY] Starting transaction for user ${userId}`);
      
      const entity = await (this.prisma as any).$transaction(async (tx: any) => {
        this.logger.debug(`[CREATOR_APPLY] Creating entity with data: ${JSON.stringify({ name: createData.name, slug: createData.slug, ownerId: createData.ownerId })}`);
        
        // Create entity with owner role (nested create works for entity_roles)
        const createdEntity = await tx.entities.create({
          data: {
            ...createData,
            entity_roles: {
              create: {
                userId,
                role: EntityRoleType.OWNER,
              },
            },
          },
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
            entity_roles: {
              include: {
                app_users: {
                  select: {
                    id: true,
                    email: true,
                    user_profiles: true,
                  },
                },
              },
            },
          },
        });

        this.logger.debug(`[CREATOR_APPLY] Entity created in transaction: ${createdEntity.id}`);

        // Create entity_application separately using raw SQL
        // (Prisma transaction client may not expose entity_applications model directly)
        const applicationId = randomUUID();
        this.logger.debug(`[CREATOR_APPLY] Creating entity_application: ${applicationId} for entity: ${createdEntity.id}`);
        
        // Use raw SQL to insert entity_application
        // proof field is Json? in schema - store as JSON string if provided, NULL otherwise
        // phone field is String? - store directly if provided, NULL otherwise
        const phoneValue = phone?.trim() || null;
        if (phoneValue) {
          this.logger.log(`[CREATOR_APPLY] Persisting phone number to entity_applications.phone: ${phoneValue}`);
        } else {
          this.logger.debug(`[CREATOR_APPLY] No phone number provided - will store NULL`);
        }
        
        if (proofValue) {
          // proofValue is already a string (URL from file upload) or JSON string
          // Wrap it in quotes to make it a valid JSON string value
          const proofJsonString = JSON.stringify(proofValue);
          // NOTE: entity_applications.id is UUID in Supabase; entity_id and owner_id are TEXT
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO entity_applications (id, entity_id, owner_id, status, proof, phone, created_at, updated_at)
              VALUES (
                ${applicationId}::uuid,
                ${createdEntity.id},
                ${userId},
                'PENDING',
                ${proofJsonString}::jsonb,
                ${phoneValue},
                NOW(),
                NOW()
              )
            `
          );
        } else {
          // No proof - insert with NULL
          // NOTE: entity_applications.id is UUID in Supabase; entity_id and owner_id are TEXT
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO entity_applications (id, entity_id, owner_id, status, proof, phone, created_at, updated_at)
              VALUES (
                ${applicationId}::uuid,
                ${createdEntity.id},
                ${userId},
                'PENDING',
                NULL,
                ${phoneValue},
                NOW(),
                NOW()
              )
            `
          );
        }

        this.logger.debug(`[CREATOR_APPLY] Entity application created: ${applicationId}`);

        return createdEntity;
      }, {
        timeout: 30000, // 30 second timeout for transaction
      });

      if (!entity || !entity.id) {
        this.logger.error(`[CREATOR_APPLY] Transaction completed but entity is missing or invalid`);
        throw new InternalServerErrorException("Failed to create entity - transaction returned invalid result");
      }

      this.logger.log(`[CREATOR_APPLY] Creator application created successfully for user ${userId}, entity ${entity.id}`);
      return entity;
    } catch (error) {
      this.logger.error(`[CREATOR_APPLY] Error caught in createCreatorApplication for user ${userId}:`, error);
      
      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(`[CREATOR_APPLY] Prisma error (code: ${error.code}): ${error.message}`, error);
        
        // P2002: Unique constraint violation
        if (error.code === "P2002") {
          const target = (error.meta as any)?.target;
          this.logger.warn(`[CREATOR_APPLY] Unique constraint violation on: ${JSON.stringify(target)}`);
          if (Array.isArray(target) && target.includes("slug")) {
            throw new ConflictException(
              "An entity with this brand name already exists. Please choose a different name."
            );
          }
          if (Array.isArray(target) && target.includes("name")) {
            throw new ConflictException(
              "An entity with this brand name already exists. Please choose a different name."
            );
          }
          throw new ConflictException("A conflict occurred while creating the application.");
        }
        
        // P2003: Foreign key constraint violation
        if (error.code === "P2003") {
          const field = (error.meta as any)?.field_name;
          this.logger.error(`[CREATOR_APPLY] Foreign key violation: ${field}`);
          throw new BadRequestException(`Invalid reference: ${field || "foreign key constraint violated"}`);
        }
        
        // Other Prisma errors
        this.logger.error(`[CREATOR_APPLY] Unhandled Prisma error: ${error.code} - ${error.message}`);
        throw new InternalServerErrorException(
          `Database error during application creation: ${error.message}`
        );
      }
      
      // Re-throw known HTTP exceptions (they already have proper status codes)
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException ||
        error instanceof NotFoundException
      ) {
        this.logger.debug(`[CREATOR_APPLY] Re-throwing HTTP exception: ${error.constructor.name}`);
        throw error;
      }
      
      // Handle unknown errors - log full details for debugging
      this.logger.error(
        `[CREATOR_APPLY] Unexpected error during application creation for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new InternalServerErrorException(
        `Unexpected error during application creation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  /**
   * Get user's entity applications
   * Returns all applications for a specific user
   */
  async getUserApplications(userId: string): Promise<{ data: any[] }> {
    const applications = await (this.prisma as any).entity_applications.findMany({
      where: { owner_id: userId },
      orderBy: { created_at: "desc" },
      include: {
        entities: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    // Transform to camelCase for frontend
    const applicationsWithDetails = applications.map((app: any) => ({
      id: app.id,
      entityId: app.entity_id,
      ownerId: app.owner_id,
      status: app.status,
      reason: app.reason,
      proof: app.proof,
      createdAt: app.created_at,
      updatedAt: app.updated_at,
      entityName: app.entities?.name || null,
      entitySlug: app.entities?.slug || null,
      entityStatus: app.entities?.status || null,
    }));

    return { data: applicationsWithDetails };
  }

  /**
   * Generate a URL-friendly slug from a string
   */
  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  async findOne(id: string) {
    try {
      const entity = await (this.prisma as any).entities.findUnique({
        where: { id },
      });
    
      if (!entity) {
        throw new NotFoundException("Entity not found");
      }
    
      return entity;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error("[EntitiesService.findOne] Error:", error);
      throw new NotFoundException("Entity not found");
    }
  }

  async findBySlug(slug: string): Promise<Entity> {
    const entity = await (this.prisma as any).entities.findUnique({
      where: { slug },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity_roles: {
          include: {
            app_users: {
              select: {
                id: true,
                email: true,
                user_profiles: true,
              },
            },
          },
        },
        events_events_entityIdToentities: {
          select: {
            id: true,
            name: true,
            thumbnail: true,
            status: true,
            startTime: true,
            phase: true,
            createdAt: true,
          },
          orderBy: { startTime: "desc" },
          take: 10,
        },
        tours_tours_primaryEntityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            thumbnail: true,
            status: true,
            startDate: true,
            createdAt: true,
          },
          orderBy: { startDate: "desc" },
          take: 10,
        },
        stores_stores_entityIdToentities: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            status: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            events_events_entityIdToentities: true,
            tours_tours_primaryEntityIdToentities: true,
            stores_stores_entityIdToentities: true,
            follows: true,
          },
        },
      },
    });

    if (!entity) {
      throw new NotFoundException("Entity not found");
    }

    return entity;
  }

  async addCollaborator(
    entityId: string,
    addCollaboratorDto: AddCollaboratorDto,
    userId: string,
    userRole: UserRole,
  ) {
    const entity = await this.findOne(entityId);

    // Check permissions: Owner, Manager with ADMIN role, or Admin
    await this.checkCollaboratorPermissions(entity, userId, userRole);

    const { userId: collaboratorUserId, role } = addCollaboratorDto;

    // Check if user exists
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: collaboratorUserId },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    // Check if already a collaborator
    const existingRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId: collaboratorUserId,
          entityId,
        },
      },
    });

    if (existingRole) {
      throw new ConflictException("User is already a collaborator");
    }

    // Cannot add owner as collaborator (owner is already created)
    if (entity.ownerId === collaboratorUserId) {
      throw new BadRequestException("Owner is already assigned to this entity");
    }

    // Create collaborator role
    const entityRole = await (this.prisma as any).entity_roles.create({
      data: {
        entityId,
        userId: collaboratorUserId,
        role,
      },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
        entity: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return entityRole;
  }

  async removeCollaborator(entityId: string, collaboratorUserId: string, userId: string, userRole: UserRole) {
    const entity = await this.findOne(entityId);

    // Check permissions
    await this.checkCollaboratorPermissions(entity, userId, userRole);

    // Cannot remove owner
    if (entity.ownerId === collaboratorUserId) {
      throw new BadRequestException("Cannot remove owner from entity");
    }

    // Check if collaborator exists
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId: collaboratorUserId,
          entityId,
        },
      },
    });

    if (!entityRole) {
      throw new NotFoundException("Collaborator not found");
    }

    // Remove collaborator
    try {
      await (this.prisma as any).entity_roles.delete({
        where: {
          userId_entityId: {
            userId: collaboratorUserId,
            entityId,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException("Collaborator not found");
      }
      throw error;
    }

    return { message: "Collaborator removed successfully" };
  }

  async getCollaborators(entityId: string) {
    const entity = await this.findOne(entityId);

    const collaborators = await (this.prisma as any).entity_roles.findMany({
      where: { entityId },
      include: {
        app_users: {
          select: {
            id: true,
            email: true,
            user_profiles: true,
          },
        },
      },
      orderBy: [
        { role: "asc" }, // OWNER first, then ADMIN, MANAGER, COORDINATOR
        { createdAt: "asc" },
      ],
    });

    return collaborators;
  }

  async delete(id: string, userId: string, userRole: UserRole) {
    const entity = await this.findOne(id);

    // Only owner or admin can delete
    if (entity.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("Only owner or admin can delete entity");
    }

    // Soft delete - set isPublic to false and optionally mark for deletion
    // For now, we'll do a hard delete (can be changed to soft delete)
    try {
      await (this.prisma as any).entities.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException("Entity not found");
      }
      throw error;
    }

    return { message: "Entity deleted successfully" };
  }

  private async checkUpdatePermissions(entity: Entity, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can update anything
    }

    if (entity.ownerId === userId) {
      return; // Owner can update
    }

    // Check if user is a manager with ADMIN role for this entity
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: entity.id,
        },
      },
    });

    if (entityRole && entityRole.role === EntityRoleType.ADMIN) {
      return; // Manager with ADMIN role can update
    }

    throw new ForbiddenException("You do not have permission to update this entity");
  }

  private async checkCollaboratorPermissions(entity: Entity, userId: string, userRole: UserRole) {
    if (userRole === UserRole.ADMIN) {
      return; // Admin can manage collaborators
    }

    if (entity.ownerId === userId) {
      return; // Owner can manage collaborators
    }

    // Check if user is a manager with ADMIN role for this entity
    const entityRole = await (this.prisma as any).entity_roles.findUnique({
      where: {
        userId_entityId: {
          userId,
          entityId: entity.id,
        },
      },
    });

    if (entityRole && (entityRole.role === EntityRoleType.ADMIN || entityRole.role === EntityRoleType.MANAGER)) {
      return; // Manager with ADMIN or MANAGER role can manage collaborators
    }

    throw new ForbiddenException("You do not have permission to manage collaborators for this entity");
  }
}

