/**
 * Consent Helper
 * 
 * Checks if user has accepted Code of Conduct
 * Required before:
 * - Joining LIVE event
 * - Joining VIP Meet & Greet
 */

import { ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

export interface ConsentStatus {
  codeOfConductAccepted: boolean;
  acceptedAt: string | null;
}

/**
 * Check if user has accepted Code of Conduct
 * Returns consent status or throws ForbiddenException if not accepted
 */
export async function checkCodeOfConductConsent(
  prisma: PrismaService,
  userId: string,
): Promise<ConsentStatus> {
  // Fetch user profile
  const profile = await (prisma as any).user_profiles.findUnique({
    where: { userId },
    select: { preferences: true },
  });

  // If no profile exists, consent is not accepted
  if (!profile || !profile.preferences) {
    throw new ForbiddenException(
      "You must accept the Code of Conduct before joining. Please review and accept the Code of Conduct in your profile settings.",
    );
  }

  const preferences = profile.preferences as any;
  const consent = preferences?.consent;

  // Check if consent exists and is accepted
  if (!consent || !consent.codeOfConductAccepted) {
    throw new ForbiddenException(
      "You must accept the Code of Conduct before joining. Please review and accept the Code of Conduct in your profile settings.",
    );
  }

  return {
    codeOfConductAccepted: consent.codeOfConductAccepted === true,
    acceptedAt: consent.acceptedAt || null,
  };
}

/**
 * Get consent status without throwing (for frontend checks)
 */
export async function getConsentStatus(
  prisma: PrismaService,
  userId: string,
): Promise<ConsentStatus | null> {
  try {
    const profile = await (prisma as any).user_profiles.findUnique({
      where: { userId },
      select: { preferences: true },
    });

    if (!profile || !profile.preferences) {
      return null;
    }

    const preferences = profile.preferences as any;
    const consent = preferences?.consent;

    if (!consent || !consent.codeOfConductAccepted) {
      return null;
    }

    return {
      codeOfConductAccepted: true,
      acceptedAt: consent.acceptedAt || null,
    };
  } catch (error) {
    return null;
  }
}

