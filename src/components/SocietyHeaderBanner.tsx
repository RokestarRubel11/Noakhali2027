import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageToggle } from './LanguageToggle.tsx';
import { SocietyCrest } from './StatusText.tsx';

export interface NotificationItem {
  id: string;
  title: string;
  meta: string;
  onClick?: () => void;
}

interface SocietyHeaderBannerProps {
  societyNameEn?: string;
  societyNameBn?: string;
  notifications?: NotificationItem[];
  showBell?: boolean;
  showLanguageToggle?: boolean;
}

export function SocietyHeaderBanner({
  societyNameEn,
  societyNameBn,
  notifications = [],
  showBell = true,
  showLanguageToggle = true,
}: SocietyHeaderBannerProps) {
  const { lang, t } = useLanguage();
  const [bellOpen, setBellOpen] = useState(false);

  const displayTop =
    lang === 'bn'
      ? societyNameBn?.split(' ').slice(0, 2).join(' ') || t('societyNameTop')
      : societyNameEn?.split(' ').slice(0, 2).join(' ') || t('societyNameTop');

  const displaySub =
    lang === 'bn'
      ? societyNameBn?.split(' ').slice(2).join(' ') || t('societyNameSub')
      : societyNameEn?.split(' ').slice(2).join(' ') || t('societyNameSub');

  return (
    <div className="w-full relative overflow-visible">
      {/* Main Navy Gradient Banner */}
      <div className="bg-gradient-to-r from-[#041E5C] via-[#09328E] to-[#0E49C9] text-white px-3.5 sm:px-6 pt-3.5 sm:pt-4 pb-6 sm:pb-7 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Golden Crest + Bilingual Title */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="rounded-full p-0.5 sm:p-1 bg-gradient-to-br from-[#FFE055] via-[#F5C518] to-[#C88A00] shadow-[0_3px_14px_rgba(245,197,24,0.38)] shrink-0">
              <SocietyCrest className="w-12 h-12 sm:w-16 sm:h-16 rounded-full" />
            </div>
            <div className="min-w-0">
              <div className="text-lg sm:text-3xl font-extrabold tracking-tight text-white leading-tight drop-shadow-xs">
                {displayTop}
              </div>
              <div className="text-sm sm:text-xl font-extrabold text-[#FFD426] leading-tight drop-shadow-xs">
                {displaySub}
              </div>
              <div className="hidden sm:block text-xs sm:text-sm font-medium text-blue-100/95 truncate mt-0.5">
                {lang === 'bn'
                  ? societyNameEn || 'Hello Noakhali Savings & Investment Society'
                  : societyNameBn || 'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি'}
              </div>
            </div>
          </div>

          {/* Right: Optional Language Toggle & Functional Notification Bell */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {showLanguageToggle && <LanguageToggle variant="dark" />}
            {showBell && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBellOpen((prev) => !prev)}
                  className="relative min-h-[42px] min-w-[42px] rounded-full bg-[#041E5C]/70 hover:bg-[#09328E] border border-white/20 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform"
                  aria-label={t('notifications')}
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[11px] font-bold tabular-nums flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setBellOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white text-[#061E54] border-2 border-[#94BDFC] shadow-xl z-50 overflow-hidden">
                      <div className="px-4 py-2.5 bg-[#041E5C] text-white text-xs font-bold flex items-center justify-between">
                        <span>{t('notifications')}</span>
                        <span className="tabular-nums text-[#FFD426]">{notifications.length}</span>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 text-center">
                          {t('noNotifications')}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                          {notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                setBellOpen(false);
                                n.onClick?.();
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-blue-50/70 transition-colors cursor-pointer"
                            >
                              <div className="text-xs font-semibold text-[#061E54]">{n.title}</div>
                              <div className="text-[11px] text-slate-500 mt-0.5">{n.meta}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sweeping Gold & Sky Curve Divider */}
        <svg
          viewBox="0 0 1440 42"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-4 sm:h-7 pointer-events-none"
          aria-hidden="true"
        >
          <path d="M0,18 C360,46 1080,-8 1440,22 L1440,42 L0,42 Z" fill="#F5C518" />
          <path d="M0,26 C380,50 1080,2 1440,28 L1440,42 L0,42 Z" fill="#EAF3FF" />
        </svg>
      </div>

      {/* Ornate Slogan Strip */}
      <div className="bg-gradient-to-r from-[#EAF3FF] via-[#FFF8D6] to-[#EAF3FF] border-b-2 border-[#F5C518]/60 py-2.5 px-4 text-center">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
          <span className="hidden sm:block h-[2px] w-14 bg-gradient-to-r from-transparent to-[#D49600] rounded-full" />
          <p className="text-sm sm:text-lg font-extrabold text-[#041E5C] tracking-wide">
            {t('societyMotto')}
          </p>
          <span className="hidden sm:block h-[2px] w-14 bg-gradient-to-l from-transparent to-[#D49600] rounded-full" />
        </div>
      </div>
    </div>
  );
}
