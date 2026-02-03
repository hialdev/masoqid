import React, { useState, useEffect } from "react";
import { useLanguageStore, type Language } from "../stores/languageStore";

interface LanguageOption {
   code: Language;
   label: string;
   flag: string;
}

const languages: LanguageOption[] = [
   { code: "id", label: "Indonesia", flag: "https://flagcdn.com/w40/id.png" },
   { code: "en", label: "English", flag: "https://flagcdn.com/w40/gb.png" },
   { code: "cn", label: "Chinese", flag: "https://flagcdn.com/w40/cn.png" },
];

interface Props {
   direction?: "up" | "down";
   className?: string;
}

export default function LanguageSwitcher({
   direction = "down",
   className = "",
}: Props) {
   const { language, setLanguage } = useLanguageStore();
   const [mounted, setMounted] = useState(false);

   // Prevent hydration mismatch
   useEffect(() => {
      setMounted(true);
   }, []);

   if (!mounted) {
      // Render skeleton or static default to avoid layout shift
      // For now returning defaults (ID) statically
      return (
         <div className={`relative group ${className}`}>
            <button className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors py-2">
               <img
                  src={languages[0].flag}
                  alt={languages[0].label}
                  className="w-5 h-5 rounded-full object-cover border border-gray-200"
               />
               <span className="hidden lg:inline">{languages[0].label}</span>
               <span className="material-symbols-outlined text-lg">
                  expand_more
               </span>
            </button>
         </div>
      );
   }

   const currentLang =
      languages.find((l) => l.code === language) || languages[0];
   const otherLangs = languages.filter((l) => l.code !== language);

   return (
      <div className={`relative group ${className}`}>
         <button className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors py-2">
            <img
               src={currentLang.flag}
               alt={currentLang.label}
               className="w-5 h-5 rounded-full object-cover border border-gray-200"
            />
            <span className="hidden lg:inline">{currentLang.label}</span>
            <span className="material-symbols-outlined text-lg">
               {direction === "down" ? "expand_more" : "expand_less"}
            </span>
         </button>

         {/* Dropdown Menu */}
         <div
            className={`absolute ${direction === "down" ? "top-full pt-2 origin-top-right" : "bottom-full mb-2 origin-bottom-right"} right-0 w-40 hidden group-hover:block transition-all duration-200 opacity-0 group-hover:opacity-100 transform z-20`}
         >
            <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden py-1">
               {otherLangs.map((lang) => (
                  <button
                     key={lang.code}
                     onClick={() => setLanguage(lang.code)}
                     className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                     <img
                        src={lang.flag}
                        alt={lang.label}
                        className="w-5 h-5 rounded-full object-cover border border-gray-200"
                     />
                     {lang.label}
                  </button>
               ))}
            </div>
         </div>
      </div>
   );
}
