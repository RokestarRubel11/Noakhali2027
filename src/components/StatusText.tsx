import { AlertCircle, CheckCircle2, Clock, PauseCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';

type StatusValue =
  | 'active'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'paid'
  | 'unpaid'
  | 'waived'
  | 'completed'
  | 'planned'
  | 'upcoming'
  | 'open'
  | 'closed'
  | 'income'
  | 'expense';

export function StatusText({ status }: { status: StatusValue }) {
  const { t } = useLanguage();

  const label = t(status);

  if (
    status === 'active' ||
    status === 'approved' ||
    status === 'paid' ||
    status === 'completed' ||
    status === 'open' ||
    status === 'income'
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === 'pending' || status === 'upcoming' || status === 'planned') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === 'rejected' || status === 'unpaid' || status === 'expense') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  if (status === 'suspended') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
        <PauseCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function SocietyCrest({ className = 'w-11 h-11' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-full border border-gold-500/40 bg-white shrink-0 ${className}`}>
      <img
        src="/assets/aistudio/______________________________________a19d7be5.png"
        alt="হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি লোগো"
        referrerPolicy="no-referrer"
        className="w-full h-full object-contain"
        onError={(e) => {
          const target = e.currentTarget;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      <div
        className="hidden w-full h-full items-center justify-center bg-navy-900 text-gold-400 font-bold text-sm"
        aria-hidden="true"
      >
        HNS
      </div>
    </div>
  );
}
