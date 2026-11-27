import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

export function LanguageToggle({ variant = 'light' }: { variant?: 'light' | 'dark' }) {
  const { lang, setLang } = useLanguage();

  const containerCls =
    variant === 'dark'
      ? 'bg-navy-800/90 border border-white/20 text-slate-200'
      : 'bg-slate-100 border border-slate-200 text-slate-700';

  const activeCls =
    variant === 'dark'
      ? 'bg-gold-500 text-navy-950 font-bold shadow-xs'
      : 'bg-[#09328E] text-white font-bold shadow-xs';

  const inactiveCls =
    variant === 'dark'
      ? 'text-slate-200 hover:text-white'
      : 'text-slate-600 hover:text-navy-900';

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-full ${containerCls} shrink-0`}
      role="group"
      aria-label="Language switcher"
    >
      <Languages className="hidden sm:block w-4 h-4 mx-1.5 opacity-80 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLang('bn')}
        className={`px-2.5 sm:px-3 py-1 min-h-[34px] text-xs rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          lang === 'bn' ? activeCls : inactiveCls
        }`}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-2.5 sm:px-3 py-1 min-h-[34px] text-xs rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          lang === 'en' ? activeCls : inactiveCls
        }`}
      >
        <span className="sm:hidden">EN</span>
        <span className="hidden sm:inline">English</span>
      </button>
    </div>
  );
}
