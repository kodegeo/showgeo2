/**
 * Code of Conduct Modal
 * 
 * Displays Code of Conduct and requires user acceptance
 * Required before joining LIVE events or VIP Meet & Greet
 */

import { useState } from "react";
import { Modal } from "@/components/creator/Modal";
import { useModalContext } from "@/state/creator/modalContext";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/creator/useToast";

const CODE_OF_CONDUCT_TEXT = `
CODE OF CONDUCT

Welcome to Showgeo. We are committed to providing a safe, respectful, and inclusive environment for all participants. By joining our events, you agree to abide by the following Code of Conduct:

1. RESPECT AND INCLUSIVITY
   - Treat all participants with respect and dignity
   - Be inclusive and welcoming to people of all backgrounds
   - Do not engage in discriminatory behavior based on race, gender, religion, nationality, sexual orientation, disability, or any other protected characteristic

2. APPROPRIATE BEHAVIOR
   - Use appropriate language and content
   - Do not share explicit, offensive, or harmful material
   - Respect others' privacy and personal boundaries

3. NO HARASSMENT
   - Do not engage in harassment, bullying, or intimidation
   - Do not make unwanted advances or comments
   - Report any inappropriate behavior immediately

4. NO IMPERSONATION
   - Do not impersonate other users, creators, or entities
   - Use your authentic identity

5. COMPLIANCE
   - Follow all applicable laws and regulations
   - Respect intellectual property rights
   - Do not engage in illegal activities

6. CONSEQUENCES
   - Violations of this Code of Conduct may result in removal from events, suspension, or permanent ban
   - Reports of violations will be reviewed by our moderation team

By accepting this Code of Conduct, you acknowledge that you have read, understood, and agree to comply with these guidelines. Your participation in Showgeo events is conditional upon your acceptance of this Code of Conduct.
`;

export function CodeOfConductModal() {
  const { currentModal, closeModal, modalData } = useModalContext();
  const updateProfile = useUpdateUserProfile();
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  const isOpen = currentModal === "codeOfConduct";
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onAccept = modalData?.onAccept;

  const handleAccept = async () => {
    if (!accepted || !user) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Merge with existing preferences
      const existingPrefs = (user.profile?.preferences as Record<string, unknown>) || {};
      const updatedPreferences = {
        ...existingPrefs,
        consent: {
          codeOfConductAccepted: true,
          acceptedAt: new Date().toISOString(),
        },
      };

      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          preferences: updatedPreferences,
        },
      });

      // Refetch user to get updated profile
      await refetchUser();

      toast({
        type: "success",
        title: "Code of Conduct accepted",
        description: "Thank you for accepting the Code of Conduct. You can now join events.",
      });

      // Call onAccept callback if provided
      if (onAccept) {
        onAccept();
      }

      closeModal();
      setAccepted(false);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save acceptance. Please try again.";
      toast({
        type: "error",
        title: "Failed to accept Code of Conduct",
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing without acceptance
      title="Code of Conduct"
      description="Please read and accept the Code of Conduct to continue"
      size="lg"
    >
      <div className="space-y-4">
        {/* Scrollable Code of Conduct Text */}
        <div className="max-h-96 overflow-y-auto p-4 bg-white/5 rounded-lg border border-white/10 text-sm text-white/80 leading-relaxed whitespace-pre-line">
          {CODE_OF_CONDUCT_TEXT}
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="accept-coc"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 bg-[#0B0B0B] border-gray-700 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label
            htmlFor="accept-coc"
            className="text-sm text-white/80 cursor-pointer"
          >
            I have read and agree to the Code of Conduct
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!accepted || isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors uppercase text-xs font-heading font-semibold tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Accepting..." : "Accept & Continue"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

