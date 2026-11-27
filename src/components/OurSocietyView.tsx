import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  User,
  Users,
  Wallet,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import type {
  SocietyFineSummary,
  SocietyMemberSummary,
  SocietyPaymentSummary,
  SocietySettings,
} from '../types.ts';

interface OurSocietyViewProps {
  members: SocietyMemberSummary[];
  payments: SocietyPaymentSummary[];
  fines: SocietyFineSummary[];
  settings: SocietySettings;
  highlightMemberId?: string;
}

type RowVisualState = 'paid' | 'pending' | 'due' | 'late';

export function OurSocietyView({
  members,
  payments,
  fines,
  settings,
  highlightMemberId,
}: OurSocietyViewProps) {
  const { lang, formatCurrency, formatDate } = useLanguage();
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'due' | 'late'>('all');

  const graceDay = Math.max(1, Math.min(28, Number(settings.graceDayOfMonth || 10)));

  // Deadline date string for the selected month (e.g., 2026-11-10)
  const monthDeadlineIso = `${selectedMonth}-${String(graceDay).padStart(2, '0')}`;
  const isMonthPastDeadline = useMemo(() => {
    if (selectedMonth < currentMonthStr) return true;
    if (selectedMonth > currentMonthStr) return false;
    return now.getDate() > graceDay;
  }, [selectedMonth, currentMonthStr, graceDay, now]);

  const rows = useMemo(() => {
    return members.map((m) => {
      const target = Number(m.monthlyTarget || settings.monthlyDepositAmount || 0);

      // Payments matching selected month (excluding fine payments for monthly target check)
      const monthApprovedPayments = payments.filter(
        (p) =>
          p.memberDocId === m.id &&
          p.month === selectedMonth &&
          p.status === 'approved' &&
          p.paymentType !== 'fine_payment'
      );
      const monthPendingPayments = payments.filter(
        (p) =>
          p.memberDocId === m.id &&
          p.month === selectedMonth &&
          p.status === 'pending' &&
          p.paymentType !== 'fine_payment'
      );

      const paidAmount = monthApprovedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
      const pendingAmount = monthPendingPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

      // Unpaid fines for this member
      const memberUnpaidFines = fines.filter(
        (f) => f.memberDocId === m.id && f.status === 'unpaid'
      );
      const unpaidFinesAmount = memberUnpaidFines.reduce((s, f) => s + Number(f.amount || 0), 0);
      const hasOverdueFine = memberUnpaidFines.some((f) => f.dueDate && f.dueDate < todayStr);

      const monthlyDue = Math.max(0, target - paidAmount);
      const totalDue = monthlyDue + unpaidFinesAmount;

      // Latest deposit date for this month, or overall latest approved deposit
      const latestMonthPayment =
        [...monthApprovedPayments, ...monthPendingPayments].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt)
        )[0] || null;

      const latestAnyPayment =
        payments
          .filter((p) => p.memberDocId === m.id && p.status === 'approved')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;

      // Determine state:
      // 1. If monthly target is paid AND no unpaid fines -> 'paid' (সবুজ)
      // 2. If monthlyDue > 0 and (past deadline OR has overdue fine) -> 'late' (লাল দাগ)
      // 3. If unpaidFinesAmount > 0 and overdue -> 'late' (লাল দাগ)
      // 4. If pending deposit covers due -> 'pending'
      // 5. Otherwise if totalDue > 0 -> 'due' (বকেয়া)
      let state: RowVisualState = 'paid';
      if (monthlyDue === 0 && unpaidFinesAmount === 0) {
        state = 'paid';
      } else if (
        (monthlyDue > 0 && isMonthPastDeadline && pendingAmount === 0) ||
        hasOverdueFine ||
        (monthlyDue > 0 && isMonthPastDeadline && paidAmount < target && pendingAmount < monthlyDue)
      ) {
        state = 'late';
      } else if (pendingAmount >= monthlyDue && monthlyDue > 0 && unpaidFinesAmount === 0) {
        state = 'pending';
      } else if (totalDue > 0) {
        state = 'due';
      }

      return {
        member: m,
        target,
        paidAmount,
        pendingAmount,
        monthlyDue,
        unpaidFinesAmount,
        totalDue,
        displayAmount: paidAmount > 0 ? paidAmount : pendingAmount > 0 ? pendingAmount : target,
        displayDate: latestMonthPayment
          ? latestMonthPayment.createdAt
          : latestAnyPayment
          ? latestAnyPayment.createdAt
          : monthDeadlineIso,
        hasMonthDepositDate: Boolean(latestMonthPayment),
        state,
      };
    });
  }, [members, payments, fines, settings, selectedMonth, isMonthPastDeadline, todayStr, monthDeadlineIso]);

  const stats = useMemo(() => {
    const paidCount = rows.filter((r) => r.state === 'paid').length;
    const lateCount = rows.filter((r) => r.state === 'late').length;
    const dueCount = rows.filter((r) => r.totalDue > 0).length;
    const totalCollected = rows.reduce((s, r) => s + r.paidAmount, 0);
    const totalDueAmount = rows.reduce((s, r) => s + r.totalDue, 0);
    return { paidCount, lateCount, dueCount, totalCollected, totalDueAmount };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === 'paid' && r.state !== 'paid') return false;
      if (statusFilter === 'late' && r.state !== 'late') return false;
      if (statusFilter === 'due' && r.totalDue <= 0) return false;
      if (!q) return true;
      return (
        r.member.name.toLowerCase().includes(q) || r.member.memberId.toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter]);

  const selectedMonthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    if (!y || !m) return selectedMonth;
    return new Date(y, m - 1, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [selectedMonth, lang]);

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#041E5C] via-[#0B3B8E] to-[#0D6B37] text-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-[#FFD426] text-xs font-extrabold mb-2">
            <Users className="w-4 h-4" />
            <span>{lang === 'bn' ? 'হ্যালো নোয়াখালী সঞ্চয় ও বিনিয়োগ সমিতি' : 'Hello Noakhali Society'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {lang === 'bn' ? 'আমাদের সমিতি' : 'Our Society'}
          </h2>
          <p className="text-sm sm:text-base font-semibold text-blue-100 mt-1">
            {lang === 'bn'
              ? `সকল সদস্যের মাসিক জমা, তারিখ, বকেয়া ও বিলম্বের পূর্ণাঙ্গ হিসাব (${selectedMonthLabel})`
              : `Complete monthly deposit, date, due & late overview for all members (${selectedMonthLabel})`}
          </p>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-3 shrink-0">
          <label className="block text-xs font-extrabold text-[#FFD426] mb-1">
            {lang === 'bn' ? 'মাস নির্বাচন করুন' : 'Select Month'}
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || currentMonthStr)}
            className="min-h-[40px] px-3 py-1.5 rounded-lg bg-white text-[#041E5C] text-sm font-extrabold cursor-pointer"
          />
        </div>
      </div>

      {/* 4 Summary Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-[#DDF0FF] border border-[#A8D1FA] p-4 text-center shadow-xs">
          <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-[#145CE0] text-white flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
            {lang === 'bn' ? 'মোট সদস্য' : 'Total Members'}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
            {members.length} {lang === 'bn' ? 'জন' : ''}
          </div>
        </div>

        <div className="rounded-2xl bg-[#DDF7E8] border-2 border-[#168A3D]/50 p-4 text-center shadow-xs">
          <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-[#168A3D] text-white flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-[#0F5E2B]">
            {lang === 'bn' ? 'জমা সম্পন্ন (সবুজ)' : 'Paid (Green)'}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#168A3D] tabular-nums mt-0.5">
            {stats.paidCount} {lang === 'bn' ? 'জন' : ''}
          </div>
          <div className="text-xs font-bold text-[#0F5E2B] tabular-nums mt-0.5">
            {formatCurrency(stats.totalCollected)}
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFF3CD] border border-[#F0C24B] p-4 text-center shadow-xs">
          <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-[#D97706] text-white flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-[#78350F]">
            {lang === 'bn' ? 'মোট বকেয়া' : 'Total Due'}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#92400E] tabular-nums mt-0.5">
            {formatCurrency(stats.totalDueAmount)}
          </div>
          <div className="text-xs font-bold text-[#92400E] tabular-nums mt-0.5">
            {stats.dueCount} {lang === 'bn' ? 'জনের বাকি' : 'members due'}
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 border-2 border-red-500 p-4 text-center shadow-xs">
          <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-[#DC2626] text-white flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-red-900">
            {lang === 'bn' ? 'লেট / লাল দাগ' : 'Late (Red Mark)'}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#DC2626] tabular-nums mt-0.5">
            {stats.lateCount} {lang === 'bn' ? 'জন' : ''}
          </div>
          <div className="text-xs font-bold text-red-700 mt-0.5">
            {lang === 'bn' ? `শেষ তারিখ: প্রতি মাসের ${graceDay} দিন` : `Due by day ${graceDay}`}
          </div>
        </div>
      </div>

      {/* Color Legend + Search & Filters */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-extrabold">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-100 text-[#0F5E2B] border border-emerald-400">
            <span className="w-3 h-3 rounded-full bg-[#168A3D]" />
            <span>{lang === 'bn' ? 'জমা দিলে সবুজ' : 'Paid = Green'}</span>
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-400">
            <span className="w-3 h-3 rounded-full bg-[#D97706]" />
            <span>{lang === 'bn' ? 'বকেয়া থাকলে বকেয়া' : 'Due Balance'}</span>
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-red-100 text-red-800 border-2 border-red-500">
            <span className="w-3 h-3 rounded-full bg-[#DC2626]" />
            <span>{lang === 'bn' ? 'লেট করলে লাল দাগ' : 'Late = Red Mark'}</span>
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                lang === 'bn' ? 'সদস্যের নাম বা আইডি দিয়ে খুঁজুন...' : 'Search by member name or ID...'
              }
              className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-sm sm:text-base font-semibold focus:outline-none focus:border-[#09328E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-xl">
            {(
              [
                { id: 'all', label: lang === 'bn' ? `সকল (${rows.length})` : `All (${rows.length})` },
                {
                  id: 'paid',
                  label: lang === 'bn' ? `জমা (${stats.paidCount})` : `Paid (${stats.paidCount})`,
                },
                {
                  id: 'due',
                  label: lang === 'bn' ? `বকেয়া (${stats.dueCount})` : `Due (${stats.dueCount})`,
                },
                {
                  id: 'late',
                  label: lang === 'bn' ? `লেট (${stats.lateCount})` : `Late (${stats.lateCount})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs sm:text-sm font-extrabold transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? f.id === 'late'
                      ? 'bg-[#DC2626] text-white'
                      : f.id === 'paid'
                      ? 'bg-[#168A3D] text-white'
                      : 'bg-[#041E5C] text-white'
                    : 'text-slate-700 hover:bg-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Member Ledger Table / Cards */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
        {filteredRows.length === 0 ? (
          <div className="p-10 text-center text-base font-bold text-slate-500">
            {lang === 'bn' ? 'কোনো সদস্য পাওয়া যায়নি।' : 'No members found.'}
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200">
              {filteredRows.map((r, idx) => {
                const isSelf = highlightMemberId === r.member.id;
                const cardClass =
                  r.state === 'paid'
                    ? 'bg-emerald-50/90 border-l-8 border-l-[#168A3D]'
                    : r.state === 'late'
                    ? 'bg-red-50/95 border-l-8 border-l-[#DC2626]'
                    : r.state === 'pending'
                    ? 'bg-amber-50/70 border-l-8 border-l-amber-500'
                    : 'bg-orange-50/60 border-l-8 border-l-orange-500';

                return (
                  <div key={r.member.id} className={`p-4 space-y-3 ${cardClass}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {r.member.avatarDataUrl ? (
                          <img
                            src={r.member.avatarDataUrl}
                            alt={r.member.name}
                            className={`w-12 h-12 rounded-full object-cover border-2 shrink-0 ${
                              r.state === 'paid'
                                ? 'border-[#168A3D]'
                                : r.state === 'late'
                                ? 'border-[#DC2626]'
                                : 'border-[#09328E]'
                            }`}
                          />
                        ) : (
                          <span className="w-12 h-12 rounded-full bg-white border border-slate-300 flex items-center justify-center shrink-0">
                            <User className="w-6 h-6 text-slate-500" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-mono font-bold text-slate-600">
                            #{idx + 1} · {r.member.memberId}
                            {isSelf && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#041E5C] text-[#FFD426] text-[10px]">
                                {lang === 'bn' ? 'আপনি' : 'You'}
                              </span>
                            )}
                          </div>
                          <div className="text-base sm:text-lg font-extrabold text-[#041E5C] truncate">
                            {r.member.name}
                          </div>
                        </div>
                      </div>

                      {r.state === 'paid' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#168A3D] text-white text-xs font-extrabold shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'জমা সম্পন্ন' : 'Paid'}</span>
                        </span>
                      ) : r.state === 'late' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#DC2626] text-white text-xs font-extrabold shrink-0 ring-2 ring-red-300">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'লেট · লাল দাগ' : 'Late'}</span>
                        </span>
                      ) : r.state === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-xs font-extrabold shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600 text-white text-xs font-extrabold shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lang === 'bn' ? 'বকেয়া' : 'Due'}</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/85 border border-slate-200 p-3 text-sm">
                      <div>
                        <div className="text-xs font-bold text-slate-500">
                          {lang === 'bn' ? 'টাকার এমাউন্ট' : 'Amount'}
                        </div>
                        <div
                          className={`text-base font-extrabold tabular-nums mt-0.5 ${
                            r.state === 'paid' ? 'text-[#168A3D]' : 'text-[#041E5C]'
                          }`}
                        >
                          {formatCurrency(r.paidAmount > 0 ? r.paidAmount : r.target)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-500">
                          {lang === 'bn' ? 'বকেয়া পরিমাণ' : 'Due Balance'}
                        </div>
                        <div
                          className={`text-base font-extrabold tabular-nums mt-0.5 ${
                            r.state === 'late'
                              ? 'text-[#DC2626] underline decoration-2 decoration-red-600'
                              : r.totalDue > 0
                              ? 'text-amber-700'
                              : 'text-[#168A3D]'
                          }`}
                        >
                          {r.totalDue > 0
                            ? `${lang === 'bn' ? 'বকেয়া ' : 'Due '}${formatCurrency(r.totalDue)}`
                            : lang === 'bn'
                            ? 'বকেয়া নেই (৳ ০)'
                            : 'Paid (৳ 0)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold pt-1">
                      <span
                        className={`inline-flex items-center gap-1.5 ${
                          r.state === 'late' ? 'text-red-700' : 'text-slate-700'
                        }`}
                      >
                        <Calendar className="w-4 h-4" />
                        <span>
                          {r.hasMonthDepositDate
                            ? `${lang === 'bn' ? 'জমার তারিখ:' : 'Paid Date:'} ${formatDate(
                                r.displayDate
                              )}`
                            : `${lang === 'bn' ? 'শেষ তারিখ:' : 'Deadline:'} ${formatDate(
                                monthDeadlineIso
                              )}`}
                        </span>
                      </span>
                      <span className="font-mono text-slate-700">
                        {lang === 'bn' ? 'মোট:' : 'Total:'} {formatCurrency(r.member.totalSavings)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#041E5C] text-white text-xs sm:text-sm font-extrabold">
                    <th className="py-3.5 px-4">{lang === 'bn' ? 'নং' : 'No.'}</th>
                    <th className="py-3.5 px-4">{lang === 'bn' ? 'সদস্যের নাম' : 'Member Name'}</th>
                    <th className="py-3.5 px-4 text-right">
                      {lang === 'bn' ? 'টাকার এমাউন্ট' : 'Amount'}
                    </th>
                    <th className="py-3.5 px-4">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                    <th className="py-3.5 px-4 text-right">
                      {lang === 'bn' ? 'বকেয়া' : 'Due Amount'}
                    </th>
                    <th className="py-3.5 px-4 text-right">
                      {lang === 'bn' ? 'মোট সঞ্চয়' : 'Total Savings'}
                    </th>
                    <th className="py-3.5 px-4 text-center">
                      {lang === 'bn' ? 'অবস্থা' : 'Status'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm sm:text-base">
                  {filteredRows.map((r, idx) => {
                    const isSelf = highlightMemberId === r.member.id;
                    const rowClass =
                      r.state === 'paid'
                        ? 'bg-emerald-50/85 hover:bg-emerald-100/70 border-l-6 border-l-[#168A3D]'
                        : r.state === 'late'
                        ? 'bg-red-50/90 hover:bg-red-100/70 border-l-6 border-l-[#DC2626]'
                        : r.state === 'pending'
                        ? 'bg-amber-50/60 hover:bg-amber-100/50 border-l-6 border-l-amber-500'
                        : 'bg-orange-50/50 hover:bg-orange-100/40 border-l-6 border-l-orange-500';

                    return (
                      <tr key={r.member.id} className={`transition-colors ${rowClass}`}>
                        <td className="py-3.5 px-4 font-mono font-extrabold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {r.member.avatarDataUrl ? (
                              <img
                                src={r.member.avatarDataUrl}
                                alt={r.member.name}
                                className={`w-10 h-10 rounded-full object-cover border-2 shrink-0 ${
                                  r.state === 'paid'
                                    ? 'border-[#168A3D]'
                                    : r.state === 'late'
                                    ? 'border-[#DC2626]'
                                    : 'border-[#09328E]'
                                }`}
                              />
                            ) : (
                              <span className="w-10 h-10 rounded-full bg-white border border-slate-300 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-slate-500" />
                              </span>
                            )}
                            <div>
                              <div className="font-extrabold text-[#041E5C] flex items-center gap-2">
                                <span>{r.member.name}</span>
                                {isSelf && (
                                  <span className="px-2 py-0.5 rounded bg-[#041E5C] text-[#FFD426] text-[11px] font-extrabold">
                                    {lang === 'bn' ? 'আপনি' : 'You'}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs font-bold text-slate-500">
                                {r.member.memberId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-extrabold tabular-nums whitespace-nowrap ${
                            r.state === 'paid'
                              ? 'text-[#168A3D]'
                              : r.state === 'late'
                              ? 'text-[#DC2626]'
                              : 'text-[#041E5C]'
                          }`}
                        >
                          {r.paidAmount > 0
                            ? formatCurrency(r.paidAmount)
                            : r.pendingAmount > 0
                            ? formatCurrency(r.pendingAmount)
                            : formatCurrency(r.target)}
                          <div className="text-xs font-semibold text-slate-500">
                            {r.paidAmount > 0
                              ? lang === 'bn'
                                ? 'জমা দিয়েছেন'
                                : 'Deposited'
                              : lang === 'bn'
                              ? 'মাসিক নির্ধারিত'
                              : 'Monthly Target'}
                          </div>
                        </td>
                        <td
                          className={`py-3.5 px-4 tabular-nums whitespace-nowrap font-bold ${
                            r.state === 'late' ? 'text-red-700' : 'text-slate-700'
                          }`}
                        >
                          <div>
                            {r.hasMonthDepositDate
                              ? formatDate(r.displayDate)
                              : formatDate(monthDeadlineIso)}
                          </div>
                          <div className="text-xs font-semibold text-slate-500">
                            {r.hasMonthDepositDate
                              ? lang === 'bn'
                                ? 'জমার তারিখ'
                                : 'Paid Date'
                              : lang === 'bn'
                              ? 'জমার শেষ তারিখ'
                              : 'Due Date'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums whitespace-nowrap">
                          {r.totalDue > 0 ? (
                            <div
                              className={`font-extrabold ${
                                r.state === 'late'
                                  ? 'text-[#DC2626] underline decoration-2 decoration-red-600'
                                  : 'text-amber-700'
                              }`}
                            >
                              {lang === 'bn' ? 'বকেয়া: ' : 'Due: '}
                              {formatCurrency(r.totalDue)}
                            </div>
                          ) : (
                            <span className="font-extrabold text-[#168A3D]">
                              {lang === 'bn' ? 'বকেয়া নেই (৳ ০)' : '৳ 0'}
                            </span>
                          )}
                          {r.unpaidFinesAmount > 0 && (
                            <div className="text-xs font-bold text-red-600">
                              {lang === 'bn' ? 'জরিমানা:' : 'Fine:'}{' '}
                              {formatCurrency(r.unpaidFinesAmount)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-[#041E5C] tabular-nums whitespace-nowrap">
                          {formatCurrency(r.member.totalSavings)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {r.state === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#168A3D] text-white text-xs sm:text-sm font-extrabold shadow-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'জমা (সবুজ)' : 'Paid'}</span>
                            </span>
                          ) : r.state === 'late' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DC2626] text-white text-xs sm:text-sm font-extrabold shadow-xs ring-2 ring-red-300">
                              <AlertTriangle className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'লেট · লাল দাগ' : 'Late (Red)'}</span>
                            </span>
                          ) : r.state === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600 text-white text-xs sm:text-sm font-extrabold">
                              <Clock className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'অপেক্ষমাণ' : 'Pending'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-600 text-white text-xs sm:text-sm font-extrabold">
                              <Clock className="w-4 h-4" />
                              <span>{lang === 'bn' ? 'বকেয়া' : 'Due'}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
