'use client';

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type DialogVariant = "alert" | "confirm";

type DialogState = {
  title: string;
  message: string;
  variant: DialogVariant;
  resolve: (value: boolean) => void;
} | null;

type AdminDialogApi = {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
};

const AdminDialogContext = createContext<AdminDialogApi | null>(null);

export function useAdminDialog() {
  const context = useContext(AdminDialogContext);

  if (!context) {
    throw new Error("useAdminDialog must be used within AdminDialogProvider.");
  }

  return context;
}

export default function AdminDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState>(null);

  const closeDialog = useCallback((value: boolean) => {
    setDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const api = useMemo<AdminDialogApi>(() => ({
    showAlert: (message, title = "Action Required") =>
      new Promise<void>((resolve) => {
        setDialog({
          title,
          message,
          variant: "alert",
          resolve: () => resolve(),
        });
      }),
    showConfirm: (message, title = "Confirm Action") =>
      new Promise<boolean>((resolve) => {
        setDialog({
          title,
          message,
          variant: "confirm",
          resolve,
        });
      }),
  }), []);

  return (
    <AdminDialogContext.Provider value={api}>
      {children}
      {dialog ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <button
            type="button"
            aria-label="Close dialog backdrop"
            onClick={() => closeDialog(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-md border border-[#3a3a3a] bg-[#1b1b1b] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
            <div className="border-b border-[#2a2a2a] px-8 py-6">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2">
                Admin Notice
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">{dialog.title}</h2>
            </div>
            <div className="px-8 py-6 text-sm leading-relaxed text-[#d5d5d5]">
              {dialog.message}
            </div>
            <div className="flex justify-end gap-3 border-t border-[#2a2a2a] px-8 py-5">
              {dialog.variant === "confirm" ? (
                <button
                  type="button"
                  onClick={() => closeDialog(false)}
                  className="px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-white border border-[#333333] hover:bg-[#222222] transition-colors"
                >
                  Cancel
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => closeDialog(true)}
                className="px-5 py-3 text-xs font-black uppercase tracking-[0.2em] bg-[#ccff00] text-[#121212] hover:bg-white transition-colors"
              >
                {dialog.variant === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminDialogContext.Provider>
  );
}
