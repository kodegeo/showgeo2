import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Entity Application Helper
 * 
 * Provides guard functions for entity application submission.
 * Ensures banned users cannot apply or reapply.
 */
export class EntityApplicationHelper {
  /**
   * Check if user is banned from entity applications
   * 
   * Reads user_profiles.preferences.isEntityBanned
   * If true, throws ForbiddenException with clear message.
   * 
   * @param prisma PrismaService instance
   * @param userId User ID to check
   * @throws ForbiddenException if user is banned
   */
  static async checkEntityApplicationEligibility(
    prisma: PrismaService,
    userId: string,
  ): Promise<void> {
    const user = await (prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: {
          select: {
            preferences: true,
          },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException("User not found");
    }

    const preferences = (user.user_profiles?.preferences as any) || {};
    
    if (preferences.isEntityBanned === true) {
      throw new ForbiddenException(
        "You are not eligible to apply as a creator on this platform.",
      );
    }
  }
}






