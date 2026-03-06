import { 
    IsString,
    IsOptional,
    IsEnum,
    IsObject,
    MaxLength,
    MinLength,
    IsUrl,
    IsBoolean 
  } from "class-validator";
  import { Transform } from "class-transformer";
  import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
  
  export enum CreatorCategory {
    MUSICIAN = "musician",
    COMEDIAN = "comedian",
    SPEAKER = "speaker",
    DANCER = "dancer",
    FITNESS = "fitness",
  }
  
  export class CreatorApplicationDto {
    @ApiProperty({
      description: "Public brand name for the creator entity",
      example: "John Doe Music Group",
    })
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    brandName: string;
  
    @ApiProperty({
      enum: CreatorCategory,
      description: "Primary category for this creator",
      example: CreatorCategory.MUSICIAN,
    })
    @IsEnum(CreatorCategory)
    category: CreatorCategory;
  
    @ApiPropertyOptional({
      description:
        "Description of how this entity will be used on the platform (replaces 'bio')",
      example:
        "I will use this creator account to host live LIVEs, release exclusive drops, and engage with fans.",
    })
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    purpose?: string;
  
    @ApiPropertyOptional({
      description: "Social media links where identity can be verified",
      example: {
        twitter: "https://twitter.com/username",
        instagram: "https://instagram.com/username",
        youtube: "https://youtube.com/channel/xyz",
      },
    })
    @Transform(({ value }) => {
      // Handle JSON string from multipart form data
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    })
    @IsOptional()
    @IsObject()
    socialLinks?: Record<string, string>;
  
    @ApiPropertyOptional({
      description: "Website URL for verification or brand information",
      example: "https://myofficialsite.com",
    })
    @IsOptional()
    @IsUrl()
    website?: string;
  
    @ApiPropertyOptional({
      description: "Thumbnail image URL (profile image)",
    })
    @IsOptional()
    @IsString()
    thumbnail?: string;
  
    @ApiPropertyOptional({
      description: "Banner image URL",
    })
    @IsOptional()
    @IsString()
    bannerImage?: string;
  
    @ApiProperty({
      description:
        "Must be true — user acknowledges entity rules, brand legitimacy, and platform terms",
      example: true,
    })
    @Transform(({ value }) => {
      // Normalize boolean from string (multipart form data) or boolean
      if (value === "true" || value === true) return true;
      if (value === "false" || value === false) return false;
      return value;
    })
    @IsBoolean()
    termsAccepted: boolean;

    @ApiPropertyOptional({
      description: "Contact phone number for verification",
      example: "+1 (555) 123-4567",
    })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({
      description: "Additional proof or evidence for the application",
      example: {
        verificationLink: "https://example.com/verification",
        additionalInfo: "Any additional information",
      },
    })
    @Transform(({ value }) => {
      // Handle JSON string from multipart form data
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          // If parsing fails, return as-is (might be a plain string)
          return value;
        }
      }
      return value;
    })
    @IsOptional()
    @IsObject()
    proof?: Record<string, any>;
  }
  