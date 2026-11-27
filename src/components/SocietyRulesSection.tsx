import { CheckCircle2, FileText, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

const SOCIETY_CORE_RULES = [
  {
    bn: 'প্রতি মাসে ৳ ৫,০০০ জমা (১ম–১০ তারিখের মধ্যে)',
    en: 'Monthly deposit of BDT 5,000 (between the 1st–10th)',
  },
  {
    bn: 'দেরিতে জমা দিলে ৳ ২০০ জরিমানা',
    en: 'BDT 200 fine applies for late monthly deposits',
  },
  {
    bn: 'প্রথম ১২ মাস শুধু সঞ্চয় (ব্যবহার করা যাবে না)',
    en: 'First 12 months are savings only (cannot be spent)',
  },
  {
    bn: '১২ মাস পর ব্যবসা/বিনিয়োগ প্রস্তাব সভায় আলোচনা',
    en: 'Business/investment proposals discussed after 12 months',
  },
  {
    bn: 'কমপক্ষে ১০ সদস্যের অনুমোদন ছাড়া সিদ্ধান্ত নয়',
    en: 'No major decision without approval from at least 10 members',
  },
  {
    bn: 'সব আয়-ব্যয়ের হিসাব সবার জন্য উন্মুক্ত',
    en: 'All income & expense ledgers are transparent to all members',
  },
  {
    bn: 'কেউ একা টাকা উত্তোলন করতে পারবে না (কমপক্ষে ২ জনের অনুমোদন প্রয়োজন)',
    en: 'No single-person withdrawal (minimum 2 approvals required)',
  },
  {
    bn: 'সদস্য ছাড়ার আগে ২–৩ মাস নোটিশ',
    en: '2–3 months advance notice required before leaving the society',
  },
  {
    bn: 'বিতর্ক আলোচনার মাধ্যমে সমাধান',
    en: 'Disputes resolved through respectful group discussion',
  },
];

export function SocietyRulesFooter() {
  const { lang, t } = useLanguage();

  return (
    <section
      aria-label={t('societyRulesHeaderTitle')}
      className="w-full rounded-2xl bg-gradient-to-br from-[#041E5C] via-[#072B7A] to-[#041A4D] text-white p-4 sm:p-5 border-2 border-[#F5C518]/70 shadow-md overflow-hidden"
    >
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FFD426] to-[#F5C518] text-[#041E5C] font-extrabold text-xs sm:text-sm shadow-xs shrink-0">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t('societyRulesHeaderTitle')}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2 text-xs sm:text-[13px] font-medium text-blue-50">
            {SOCIETY_CORE_RULES.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-snug">
                <CheckCircle2
                  className="w-4 h-4 text-[#FFD426] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{lang === 'bn' ? rule.bn : rule.en}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:w-64 shrink-0 rounded-xl bg-gradient-to-br from-[#FFE055] via-[#F5C518] to-[#D99B00] text-[#041E5C] px-4 py-3 text-center shadow-sm border border-yellow-200">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
            {lang === 'bn' ? 'হ্যালো নোয়াখালী' : 'Hello Noakhali'}
          </div>
          <div className="text-[11px] sm:text-xs font-bold mt-0.5 text-[#061E54]/90">
            — {lang === 'bn' ? 'আমাদের সমিতি, আমাদের শক্তি' : 'Our Society, Our Strength'} —
          </div>
        </div>
      </div>
    </section>
  );
}

export function SocietyRulesView() {
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-[#041E5C] via-[#09328E] to-[#168A3D] text-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FFD426]/20 border border-[#FFD426]/60 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#FFD426]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold">{t('societyRulesHeaderTitle')}</h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">{t('societyPowerBadge')}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 divide-y divide-slate-100 shadow-xs overflow-hidden">
        {SOCIETY_CORE_RULES.map((rule, idx) => (
          <div
            key={idx}
            className="px-4 sm:px-6 py-4 flex items-start gap-3.5 hover:bg-sky-50/40 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-[#09328E] text-[#FFD426] font-bold text-xs flex items-center justify-center shrink-0 tabular-nums">
              {idx + 1}
            </span>
            <p className="text-sm sm:text-base font-semibold text-[#061E54] leading-relaxed">
              {lang === 'bn' ? rule.bn : rule.en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
