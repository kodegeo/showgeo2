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
    @IsBoolean()
    termsAccepted: boolean;
  }
  