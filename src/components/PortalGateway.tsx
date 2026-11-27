import { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Coins,
  Handshake,
  MapPin,
  Menu,
  Phone,
  ShieldCheck,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageToggle } from './LanguageToggle.tsx';
import { SocietyCrest } from './StatusText.tsx';

interface PortalGatewayProps {
  onSelectAdmin: () => void;
  onSelectMember: () => void;
  societyNameEn?: string;
  societyNameBn?: string;
}

export function PortalGateway({
  onSelectAdmin,
  onSelectMember,
  societyNameEn,
  societyNameBn,
}: PortalGatewayProps) {
  const { lang, t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  const displayTop =
    lang === 'bn'
      ? societyNameBn?.split(' ').slice(0, 2).join(' ') || t('societyNameTop')
      : societyNameEn?.split(' ').slice(0, 2).join(' ') || t('societyNameTop');

  const displaySub =
    lang === 'bn'
      ? societyNameBn?.split(' ').slice(2).join(' ') || t('societyNameSub')
      : societyNameEn?.split(' ').slice(2).join(' ') || t('societyNameSub');

  return (
    <div className="min-h-screen flex flex-col bg-[#EAF3FF] text-[#061E54]">
      {/* Top Curved Navy & Gold Header */}
      <header className="relative bg-gradient-to-r from-[#041E5C] via-[#09328E] to-[#0E49C9] text-white px-3.5 sm:px-8 pt-3.5 sm:pt-4 pb-7 sm:pb-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <div className="rounded-full p-0.5 bg-gradient-to-br from-[#FFD426] to-[#D49600] shadow-md shrink-0">
              <SocietyCrest className="w-11 h-11 sm:w-16 sm:h-16 rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-3xl font-bold tracking-tight text-white leading-tight truncate">
                {displayTop}
              </div>
              <div className="text-xs sm:text-xl font-bold text-[#FFD426] leading-tight truncate">
                {displaySub}
              </div>
              <div className="hidden sm:block text-xs text-blue-100 truncate mt-0.5">
                {lang === 'bn'
                  ? societyNameEn || 'Hello Noakhali Savings & Investment Society'
                  : societyNameBn || 'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageToggle variant="dark" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="min-h-[42px] min-w-[42px] rounded-xl bg-navy-900/60 hover:bg-navy-800 border border-white/15 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                aria-label="Portal Menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white text-navy-900 border border-slate-200 shadow-xl z-50 overflow-hidden py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onSelectAdmin();
                      }}
                      className="w-full text-left px-4 py-3.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 text-blue-700" />
                      <span>{t('adminLoginTitle')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onSelectMember();
                      }}
                      className="w-full text-left px-4 py-3.5 text-sm font-semibold hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Users className="w-4 h-4 text-emerald-700" />
                      <span>{t('memberLoginTitle')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sweeping Gold & Sky Curve */}
        <svg
          viewBox="0 0 1440 42"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-4 sm:h-7 pointer-events-none"
          aria-hidden="true"
        >
          <path d="M0,16 C360,44 1080,-8 1440,22 L1440,42 L0,42 Z" fill="#F5C518" />
          <path d="M0,24 C380,48 1080,0 1440,28 L1440,42 L0,42 Z" fill="#CFE6FF" />
        </svg>
      </header>

      {/* Scenic Hero Strip */}
      <section className="relative bg-gradient-to-b from-[#CFE6FF] via-[#E1EFFF] to-[#EAF3FF] pt-5 pb-12 sm:pt-6 sm:pb-14 px-4 sm:px-8 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 items-center gap-4 sm:gap-6">
          <div className="hidden md:flex md:col-span-3 justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-emerald-100 border-2 border-gold-400/60 flex flex-col items-center justify-center shadow-sm">
              <Coins className="w-12 h-12 text-gold-600" aria-hidden="true" />
              <span className="text-xs font-bold text-navy-900 mt-1.5">
                {lang === 'bn' ? 'সঞ্চয় · উন্নয়ন' : 'Save · Grow'}
              </span>
            </div>
          </div>

          <div className="md:col-span-6 text-center">
            <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold text-navy-900 tracking-tight text-balance">
              {t('societyMotto')}
            </h1>
            <p className="mt-1.5 sm:mt-2.5 text-xs sm:text-base font-medium text-slate-700">
              {t('societyTagline')}
            </p>
          </div>

          <div className="hidden md:flex md:col-span-3 justify-center">
            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-white to-blue-100 border-2 border-blue-200 flex flex-col items-center justify-center shadow-sm px-3 text-center">
              <Building2 className="w-11 h-11 text-[#09328E]" aria-hidden="true" />
              <span className="text-[11px] font-bold text-navy-900 mt-1.5 leading-tight">
                {t('societyShort')}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Card Admin & Member Login Gateway */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 -mt-6 sm:-mt-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-10 md:gap-8 pt-4 md:pt-0 items-stretch">
          {/* Card 1: Admin Login (Blue) */}
          <div className="rounded-2xl bg-white border border-blue-200 shadow-md flex flex-col justify-between overflow-visible">
            <div className="relative bg-gradient-to-b from-blue-600 to-blue-800 text-white pt-10 pb-4 sm:pb-5 px-5 text-center rounded-t-2xl rounded-b-[26px]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-blue-700 border-4 border-white shadow-md flex items-center justify-center mx-auto -mt-16 mb-2.5">
                <UserCog className="w-7 h-7 sm:w-8 sm:h-8 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold leading-tight">
                {t('adminLoginTitle')}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-gold-400 mt-0.5">
                {t('adminLoginSubtitle')}
              </p>
            </div>

            <div className="p-4 sm:p-6 text-center flex-1 flex flex-col justify-between">
              <p className="text-xs sm:text-sm font-medium text-slate-700 mb-4 sm:mb-5">
                {t('adminLoginDesc')}
              </p>
              <button
                type="button"
                onClick={onSelectAdmin}
                className="w-full min-h-[48px] px-5 py-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{t('enterAdminPortal')}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 2: Member Login (Green) */}
          <div className="rounded-2xl bg-white border border-emerald-200 shadow-md flex flex-col justify-between overflow-visible">
            <div className="relative bg-gradient-to-b from-emerald-500 to-emerald-700 text-white pt-10 pb-4 sm:pb-5 px-5 text-center rounded-t-2xl rounded-b-[26px]">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-600 border-4 border-white shadow-md flex items-center justify-center mx-auto -mt-16 mb-2.5">
                <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" aria-hidden="true" />
              </div>
              <h2 className="text-lg sm:text-2xl font-bold leading-tight">
                {t('memberLoginTitle')}
              </h2>
              <p className="text-xs sm:text-sm font-bold text-amber-200 mt-0.5">
                {t('memberLoginSubtitle')}
              </p>
            </div>

            <div className="p-4 sm:p-6 text-center flex-1 flex flex-col justify-between">
              <p className="text-xs sm:text-sm font-medium text-slate-700 mb-4 sm:mb-5">
                {t('memberLoginDesc')}
              </p>
              <button
                type="button"
                onClick={onSelectMember}
                className="w-full min-h-[48px] px-5 py-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{t('enterMemberPortal')}</span>
                <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* 4-Item Trust & Values Strip */}
        <div className="mt-6 sm:mt-7 rounded-2xl bg-white border border-blue-200/80 shadow-xs grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          <div className="p-3.5 sm:p-4 flex items-center justify-center gap-2 text-navy-900 font-bold text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 shrink-0" aria-hidden="true" />
            <span>{t('trustGrowth')}</span>
          </div>
          <div className="p-3.5 sm:p-4 flex items-center justify-center gap-2 text-navy-900 font-bold text-xs sm:text-sm">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700 shrink-0" aria-hidden="true" />
            <span>{t('trustSecure')}</span>
          </div>
          <div className="p-3.5 sm:p-4 flex items-center justify-center gap-2 text-navy-900 font-bold text-xs sm:text-sm">
            <Handshake className="w-4 h-4 sm:w-5 sm:h-5 text-blue-800 shrink-0" aria-hidden="true" />
            <span>{t('trustBond')}</span>
          </div>
          <div className="p-3.5 sm:p-4 flex items-center justify-center gap-2 text-navy-900 font-bold text-xs sm:text-sm">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gold-600 shrink-0" aria-hidden="true" />
            <span>{t('trustFuture')}</span>
          </div>
        </div>
      </main>

      {/* Curved Navy & Gold Footer */}
      <footer className="relative bg-gradient-to-r from-[#041E5C] via-[#082E85] to-[#041E5C] text-white pt-8 sm:pt-10 pb-5 px-4 sm:px-8 mt-2">
        <svg
          viewBox="0 0 1440 36"
          preserveAspectRatio="none"
          className="absolute top-0 left-0 w-full h-4 sm:h-6 pointer-events-none rotate-180"
          aria-hidden="true"
        >
          <path d="M0,14 C360,38 1080,-6 1440,18 L1440,36 L0,36 Z" fill="#F5C518" />
          <path d="M0,22 C380,42 1080,0 1440,24 L1440,36 L0,36 Z" fill="#EAF3FF" />
        </svg>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-3 sm:gap-4 text-center md:text-left pb-4 border-b border-white/15">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs sm:text-sm">
            <Phone className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
            <span>
              {t('contactPhoneLabel')}: <strong className="font-mono">01612-345678</strong>
            </span>
          </div>

          <div className="text-xs sm:text-base font-bold text-gold-400 text-center">
            {t('footerPoeticMotto')}
          </div>

          <div className="flex items-center justify-center md:justify-end gap-2 text-xs sm:text-sm text-slate-200">
            <MapPin className="w-4 h-4 text-gold-400 shrink-0" aria-hidden="true" />
            <span>{t('locationLabel')}</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-3.5 text-center text-[11px] sm:text-xs text-slate-300">
          © 2026 Hello Noakhali Savings &amp; Investment Society. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
