/**
 * Consent Hook
 * 
 * Checks if user has accepted Code of Conduct
 */

import { useMemo } from "react";
import { useAuth } from "./useAuth";

export interface ConsentStatus {
  codeOfConductAccepted: boolean;
  acceptedAt: string | null;
}

/**
 * Hook to check if user has accepted Code of Conduct
 */
export function useConsent(): ConsentStatus | null {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user?.profile?.preferences) {
      return null;
    }

    const preferences = user.profile.preferences as {
      consent?: {
        codeOfConductAccepted?: boolean;
        acceptedAt?: string;
      };
    };

    const consent = preferences?.consent;

    if (!consent || !consent.codeOfConductAccepted) {
      return null;
    }

    return {
      codeOfConductAccepted: true,
      acceptedAt: consent.acceptedAt || null,
    };
  }, [user?.profile?.preferences]);
}

/**
 * Hook to check if consent is required (not accepted)
 */
export function useConsentRequired(): boolean {
  const consent = useConsent();
  return consent === null;
}

