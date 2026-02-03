import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Language = "id" | "en" | "cn";

interface LanguageState {
   language: Language;
   setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
   persist(
      (set) => ({
         language: "id",
         setLanguage: (lang) => {
            set({ language: lang });
            // Dispatch custom event for vanilla JS listeners
            if (typeof window !== "undefined") {
               window.dispatchEvent(
                  new CustomEvent("language-change", { detail: lang }),
               );
               document.documentElement.lang = lang; // Update html lang attribute
               localStorage.setItem("language", lang); // Compatibility with WhatsAppButton
            }
         },
      }),
      {
         name: "language-storage",
         storage: createJSONStorage(() => localStorage),
         onRehydrateStorage: () => (state) => {
            // When rehydrated, ensure html lang matches
            if (state && typeof document !== "undefined") {
               document.documentElement.lang = state.language;
               window.dispatchEvent(
                  new CustomEvent("language-change", {
                     detail: state.language,
                  }),
               );
            }
         },
      },
   ),
);
