"use client";

import { VerifiedAccountChangeModal } from "./verified-account-change-modal";

export function ChangePasswordModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}) {
  if (!isOpen) return null;
  return <VerifiedAccountChangeModal purpose="password" onClose={onClose} onSuccess={onSuccess} />;
}
