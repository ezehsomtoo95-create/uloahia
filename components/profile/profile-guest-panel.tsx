"use client";

import { UnifiedAuthScreenRoot } from "@/components/auth/unified-auth-screen";
import { ProfileSupportSettings } from "@/components/profile/profile-support-settings";

export function ProfileGuestPanel() {
  return (
    <div className="account-guest">
      <UnifiedAuthScreenRoot
        embedded
        syncUrl={false}
        returnPath="/profile"
      />
      <ProfileSupportSettings showAccountActions={false} />
    </div>
  );
}
