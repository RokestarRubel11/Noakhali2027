import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileDown,
  FileSpreadsheet,
  FileText,
  Globe,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  RefreshCw,
  Settings,
  Smartphone,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { MEMBER_UPLIFTING_QUOTES } from '../../data/memberQuotes.ts';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { apiRequest, getMemberToken, setMemberToken } from '../../lib/api.ts';
import { processAnyImageToDataUrl } from '../../lib/imageUtils.ts';
import { downloadReceiptPdf } from '../../lib/reports.ts';
import type { MemberOverviewResponse, PaymentMethod, PaymentType } from '../../types.ts';
import { LanguageToggle } from '../LanguageToggle.tsx';
import { MembershipRegistrationForm } from '../MembershipRegistrationForm.tsx';
import { OurSocietyView } from '../OurSocietyView.tsx';
import type { NotificationItem } from '../SocietyHeaderBanner.tsx';
import { SocietyRulesFooter, SocietyRulesView } from '../SocietyRulesSection.tsx';
import { SocietyCrest, StatusText } from '../StatusText.tsx';

type MemberTab =
  | 'overview'
  | 'society'
  | 'profile'
  | 'history'
  | 'pay'
  | 'investments'
  | 'statements'
  | 'receipts'
  | 'notices'
  | 'rules'
  | 'settings';

export function MemberDashboard({ onLogout }: { onLogout: () => void }) {
  const { lang, t, formatCurrency, formatDate } = useLanguage();
  const [tab, setTab] = useState<MemberTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState<MemberOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [quoteIdx, setQuoteIdx] = useState<number>(() => {
    try {
      const prev = Number(window.localStorage.getItem('hn_last_quote_idx') ?? '-1');
      const next =
        Number.isFinite(prev) && prev >= 0
          ? (prev + 1 + Math.floor(Math.random() * 3)) % MEMBER_UPLIFTING_QUOTES.length
          : Math.floor(Math.random() * MEMBER_UPLIFTING_QUOTES.length);
      window.localStorage.setItem('hn_last_quote_idx', String(next));
      return next;
    } catch {
      return 0;
    }
  });

  // Payment submission state
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [method, setMethod] = useState<PaymentMethod>('bkash');
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly_deposit');
  const [month, setMonth] = useState(currentMonthStr);
  const [amount, setAmount] = useState('5000');
  const [senderAccount, setSenderAccount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [note, setNote] = useState('');
  const [screenshotDataUrl, setScreenshotDataUrl] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedField, setCopiedField] = useState('');

  // History filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>(
    'all'
  );

  // Password change & quick avatar upload
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setError('');
    try {
      const res = await apiRequest<MemberOverviewResponse>('/api/member/overview', {
        token: getMemberToken(),
      });
      setData(res);
      setAmount(String(res.member.monthlyTarget || res.settings.monthlyDepositAmount));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load member dashboard';
      setError(msg);
      if (msg.includes('401') || msg.includes('403') || msg.toLowerCase().includes('forbidden')) {
        setMemberToken(null);
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rotate inspiring/cheerful quote automatically every 30 seconds (no manual switch button)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIdx((prev) => {
        const next = (prev + 1) % MEMBER_UPLIFTING_QUOTES.length;
        try {
          window.localStorage.setItem('hn_last_quote_idx', String(next));
        } catch {
          // ignore storage errors
        }
        return next;
      });
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSignOut = () => {
    setMemberToken(null);
    onLogout();
  };

  const handleSelectTab = (nextTab: MemberTab) => {
    setTab(nextTab);
    setMobileMenuOpen(false);
  };

  const handleFileToDataUrl = async (file: File | undefined, setter: (val: string) => void) => {
    if (!file) return;
    try {
      const dataUrl = await processAnyImageToDataUrl(file, 900);
      setter(dataUrl);
    } catch {
      showToast(lang === 'bn' ? 'ছবি পড়া যায়নি, অন্য ছবি চেষ্টা করুন' : 'Could not read image file', true);
    }
  };

  const handleQuickAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const avatarDataUrl = await processAnyImageToDataUrl(file, 720);
      await apiRequest('/api/member/profile', {
        method: 'PATCH',
        token: getMemberToken(),
        body: JSON.stringify({ avatarDataUrl }),
      });
      await loadData();
      showToast(t('profileUpdated'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCopy = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayment(true);
    try {
      await apiRequest('/api/member/payments', {
        method: 'POST',
        token: getMemberToken(),
        body: JSON.stringify({
          paymentType,
          month,
          amount: Number(amount),
          method,
          senderAccount,
          transactionId,
          note,
          screenshotDataUrl,
        }),
      });
      setSenderAccount('');
      setTransactionId('');
      setNote('');
      setScreenshotDataUrl('');
      await loadData();
      showToast(t('paymentSubmittedSuccess'));
      handleSelectTab('history');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await apiRequest(`/api/member/polls/${pollId}/vote`, {
        method: 'POST',
        token: getMemberToken(),
        body: JSON.stringify({ optionId }),
      });
      await loadData();
      showToast(t('alreadyVoted'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      await apiRequest('/api/member/profile', {
        method: 'PATCH',
        token: getMemberToken(),
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      await loadData();
      showToast(t('profileUpdated'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const navItems: {
    id: MemberTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'overview', label: t('mNavDashboard'), icon: LayoutDashboard },
    { id: 'society', label: t('mNavOurSociety'), icon: Building2 },
    { id: 'profile', label: t('mNavMyProfile'), icon: User },
    { id: 'history', label: t('mNavDepositHistory'), icon: History },
    { id: 'pay', label: t('mNavPay'), icon: HandCoins },
    { id: 'investments', label: t('navInvestments'), icon: TrendingUp },
    { id: 'statements', label: t('mNavStatements'), icon: FileSpreadsheet },
    { id: 'receipts', label: t('mNavReceipts'), icon: FileDown },
    { id: 'notices', label: t('mNavNotices'), icon: Megaphone },
    { id: 'rules', label: t('mNavRules'), icon: FileText },
    { id: 'settings', label: t('mNavSettings'), icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EAF3FF] text-navy-900">
        <div className="text-sm font-semibold">{t('loadingData')}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#EAF3FF] p-6 text-center">
        <p className="text-sm text-red-700 mb-4">{error || 'Unable to load Member Dashboard'}</p>
        <button
          type="button"
          onClick={handleSignOut}
          className="px-4 py-2 rounded-xl bg-navy-900 text-white text-sm font-semibold cursor-pointer"
        >
          {t('backToGateway')}
        </button>
      </div>
    );
  }

  const notifications: NotificationItem[] = [
    ...data.meetings
      .filter((m) => m.status === 'upcoming')
      .map((m) => ({
        id: m.id,
        title: lang === 'bn' ? m.titleBn : m.titleEn,
        meta: `${formatDate(m.date)} · ${m.time}`,
        onClick: () => handleSelectTab('notices'),
      })),
    ...data.polls
      .filter((p) => p.status === 'open' && !p.votedMemberIds.includes(data.member.id))
      .map((p) => ({
        id: p.id,
        title: lang === 'bn' ? p.questionBn : p.questionEn,
        meta: `${t('open')} · ${t('castVote')}`,
        onClick: () => handleSelectTab('investments'),
      })),
  ];

  const currentYear = new Date().getFullYear();
  const monthsOfYear = Array.from({ length: 12 }, (_, idx) => {
    const mNum = String(idx + 1).padStart(2, '0');
    const ym = `${currentYear}-${mNum}`;
    const approved = data.payments.some(
      (p) => p.month === ym && p.status === 'approved' && p.paymentType !== 'fine_payment'
    );
    const pending = data.payments.some(
      (p) => p.month === ym && p.status === 'pending' && p.paymentType !== 'fine_payment'
    );
    const label = new Date(currentYear, idx, 1).toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
    });
    return { ym, label, status: approved ? 'approved' : pending ? 'pending' : 'due' };
  });

  const thisMonthApprovedAmount = data.payments
    .filter(
      (p) =>
        p.month === currentMonthStr &&
        p.status === 'approved' &&
        p.paymentType !== 'fine_payment'
    )
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const totalDepositedAmount = data.payments
    .filter((p) => p.status === 'approved' && p.paymentType !== 'fine_payment')
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  const unpaidFines = data.fines.filter((f) => f.status === 'unpaid');
  const unpaidFinesTotal = unpaidFines.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const filteredHistory = data.payments.filter((p) =>
    historyFilter === 'all' ? true : p.status === historyFilter
  );

  const approvedReceipts = data.payments.filter((p) => p.status === 'approved');

  const societyMembersList = data.societyMembers || [];
  const societyPaymentsList = data.societyPayments || [];
  const societyFinesList = data.societyFines || [];
  const graceDay = Math.max(1, Math.min(28, Number(data.settings.graceDayOfMonth || 10)));
  const isPastCurrentGrace = new Date().getDate() > graceDay;
  const todayIso = new Date().toISOString().slice(0, 10);
  const societySummaryCounts = societyMembersList.reduce(
    (acc, m) => {
      const target = Number(m.monthlyTarget || data.settings.monthlyDepositAmount || 0);
      const paid = societyPaymentsList
        .filter(
          (p) =>
            p.memberDocId === m.id &&
            p.month === currentMonthStr &&
            p.status === 'approved' &&
            p.paymentType !== 'fine_payment'
        )
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const unpaidFinesMem = societyFinesList.filter(
        (f) => f.memberDocId === m.id && f.status === 'unpaid'
      );
      const fineTotal = unpaidFinesMem.reduce((s, f) => s + Number(f.amount || 0), 0);
      const overdueFine = unpaidFinesMem.some((f) => f.dueDate && f.dueDate < todayIso);
      const due = Math.max(0, target - paid) + fineTotal;
      if (due === 0) acc.paid += 1;
      else if ((Math.max(0, target - paid) > 0 && isPastCurrentGrace) || overdueFine) acc.late += 1;
      else acc.due += 1;
      return acc;
    },
    { paid: 0, due: 0, late: 0 }
  );

  const firstPoll = data.polls[0];
  const firstPollVotes = firstPoll
    ? firstPoll.options.reduce((sum, o) => sum + o.votes, 0)
    : 0;
  const firstPollTopOption = firstPoll?.options[0];
  const firstPollPct =
    firstPoll && firstPollVotes > 0 && firstPollTopOption
      ? Math.round((firstPollTopOption.votes / firstPollVotes) * 100)
      : 0;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#041E5C] text-white">
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="rounded-full p-0.5 bg-gradient-to-br from-[#FFE055] to-[#C88A00] shrink-0">
          <SocietyCrest className="w-11 h-11 rounded-full" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-extrabold text-white leading-tight truncate">
            {lang === 'bn' ? 'হ্যালো নোয়াখালী' : 'Hello Noakhali'}
          </div>
          <div className="text-xs font-bold text-[#FFD426] leading-tight truncate">
            {lang === 'bn' ? 'সঞ্চয় ও বিনিয়োগ সমিতি' : 'Savings & Investment'}
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full min-h-[44px] px-3 py-2.5 rounded-lg flex items-center gap-2.5 text-sm sm:text-[15px] font-extrabold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#168A3D] text-white shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-blue-200'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#1565C0] hover:bg-[#0D47A1] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#EAF3FF] text-[#061E54]">
      {/* Top Scenic Navy & Emerald Header matching Image 2 */}
      <header className="relative bg-gradient-to-r from-[#041E5C] via-[#0B3B8E] to-[#0D6B37] text-white px-3.5 sm:px-6 py-3 shadow-md z-30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden min-h-[40px] min-w-[40px] rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer shrink-0"
              aria-label="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="rounded-full p-0.5 bg-gradient-to-br from-[#FFE055] to-[#C88A00] shrink-0">
              <SocietyCrest className="w-11 h-11 sm:w-12 sm:h-12 rounded-full" />
            </div>

            <div className="min-w-0">
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD426] leading-tight truncate">
                {lang === 'bn' ? data.settings.societyNameBn : data.settings.societyNameEn}
              </div>
              <div className="text-xs sm:text-sm font-bold text-blue-100 truncate">
                {t('societyMotto')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="hidden md:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#0F7D38] to-[#169C43] border border-emerald-300/40 text-xs font-extrabold tracking-wide text-white shadow-xs">
              <User className="w-4 h-4 text-[#FFD426]" />
              <span>MEMBER PAGE</span>
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBellOpen((prev) => !prev)}
                className="relative min-h-[40px] min-w-[40px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                aria-label={t('notifications')}
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              {bellOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} />
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

            <button
              type="button"
              onClick={loadData}
              className="min-h-[40px] min-w-[40px] rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              title={t('refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('profile')}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-xs sm:text-sm font-extrabold max-w-[190px] cursor-pointer transition-colors"
              title={t('mNavMyProfile')}
            >
              {data.member.avatarDataUrl ? (
                <img
                  src={data.member.avatarDataUrl}
                  alt={data.member.name || 'Member'}
                  className="w-7 h-7 rounded-full object-cover border border-[#FFD426] shrink-0"
                />
              ) : (
                <User className="w-4 h-4 text-[#FFD426] shrink-0" />
              )}
              <span className="truncate">{data.member.name || 'Member'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer (No bottom tab bar) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] h-full z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 text-white cursor-pointer"
              aria-label={t('close')}
            >
              <X className="w-4 h-4" />
            </button>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Split Workspace: Left Navy Sidebar + Right Content */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <aside className="hidden lg:block w-60 xl:w-64 shrink-0 border-r border-slate-200 shadow-sm">
          <div className="sticky top-0 h-[calc(100vh-64px)]">{renderSidebarContent()}</div>
        </aside>

        <main className="flex-1 min-w-0 p-3.5 sm:p-6 space-y-5">
          {toast && (
            <div
              className={`rounded-xl px-4 py-3 text-sm font-medium border ${
                toast.isError
                  ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {toast.msg}
            </div>
          )}

          {tab !== 'overview' && (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setTab('overview')}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#09328E] active:scale-[0.98] text-[#061E54] text-sm font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#09328E]" />
                <span>{t('backBtn')}</span>
              </button>
              <span className="text-xs font-bold text-slate-600 truncate">
                {navItems.find((n) => n.id === tab)?.label}
              </span>
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-4">
              {/* Member Identity Strip matching Image 2 */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="relative shrink-0">
                    {data.member.avatarDataUrl ? (
                      <img
                        src={data.member.avatarDataUrl}
                        alt={data.member.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-[#09328E] shadow-sm"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#09328E] to-blue-700 border-3 border-[#F5C518] flex items-center justify-center text-white shadow-sm">
                        <User className="w-8 h-8 text-[#FFD426]" />
                      </div>
                    )}
                    <label
                      className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#168A3D] hover:bg-emerald-800 text-white border-2 border-white flex items-center justify-center shadow-sm cursor-pointer"
                      title={lang === 'bn' ? 'যেকোনো ছবি আপলোড করুন' : 'Upload Photo'}
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={(e) => handleQuickAvatarChange(e.target.files?.[0])}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-[#041E5C] truncate">
                      {data.member.name || data.member.email}
                    </h2>
                    <div className="text-xs sm:text-sm font-mono font-bold text-slate-700 mt-0.5">
                      {t('memberIdBadge')}: {data.member.memberId}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#168A3D] text-white text-xs font-extrabold">
                        <span>{t(data.member.status)}</span>
                      </span>
                      <label className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EEF5FF] hover:bg-blue-100 border border-[#94BDFC] text-[#041E5C] text-xs font-bold cursor-pointer">
                        <Camera className="w-3 h-3 text-[#09328E]" />
                        <span>
                          {uploadingAvatar
                            ? lang === 'bn'
                              ? 'আপলোড হচ্ছে...'
                              : 'Uploading...'
                            : data.member.avatarDataUrl
                            ? lang === 'bn'
                              ? 'ছবি পরিবর্তন'
                              : 'Change Photo'
                            : lang === 'bn'
                            ? 'নিজের ছবি দিন'
                            : 'Add Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingAvatar}
                          onChange={(e) => handleQuickAvatarChange(e.target.files?.[0])}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSelectTab('pay')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0D7A32] to-[#169C43] hover:brightness-105 text-white text-sm sm:text-base font-extrabold inline-flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <HandCoins className="w-4 h-4" />
                    <span>{t('payNowAction')}</span>
                  </button>
                </div>
              </div>

              {/* 2 Rule Pills Row matching Image 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#168A3D] text-white px-4 py-3 flex items-center justify-center gap-2.5 text-sm sm:text-base font-extrabold shadow-xs">
                  <Calendar className="w-4 h-4 text-[#FFD426] shrink-0" />
                  <span>{t('first12MonthsRulePill')}</span>
                </div>
                <div className="rounded-xl bg-[#041E5C] text-white px-4 py-3 flex items-center justify-center gap-2.5 text-sm sm:text-base font-extrabold shadow-xs">
                  <Users className="w-4 h-4 text-[#FFD426] shrink-0" />
                  <span>{t('twoApproverWithdrawalPill')}</span>
                </div>
              </div>

              {/* 30-Second Auto-Rotating Uplifting Quote Card (No manual switch button) */}
              {(() => {
                const quote = MEMBER_UPLIFTING_QUOTES[quoteIdx % MEMBER_UPLIFTING_QUOTES.length];
                return (
                  <div className="rounded-2xl bg-gradient-to-r from-[#FFFDF2] via-white to-[#EEF5FF] border-2 border-[#F5C518]/70 p-4 shadow-xs flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0E51D6] to-[#041E5C] border-2 border-[#FFD426] text-[#FFD426] flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-[#B48600]">
                        {lang === 'bn' ? quote.tagBn : quote.tagEn}
                      </div>
                      <p className="text-base sm:text-lg font-extrabold text-[#061E54] leading-snug mt-0.5">
                        “{lang === 'bn' ? quote.bn : quote.en}”
                      </p>
                    </div>
                  </div>
                );
              })()}

              {unpaidFinesTotal > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-amber-900">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span className="text-sm sm:text-base font-bold">
                      {t('unpaidFinesAlert')} {formatCurrency(unpaidFinesTotal)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('fine_payment');
                      setAmount(String(unpaidFinesTotal));
                      handleSelectTab('pay');
                    }}
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-700 text-white text-xs sm:text-sm font-extrabold cursor-pointer whitespace-nowrap"
                  >
                    {t('payNowAction')}
                  </button>
                </div>
              )}

              {/* 4 Pastel KPI Cards matching Image 2 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-[#DDF7E8] border border-[#9FE0BA] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#168A3D] text-white flex items-center justify-center shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiThisMonthDeposit')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(thisMonthApprovedAmount)}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#DDF0FF] border border-[#A8D1FA] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#145CE0] text-white flex items-center justify-center shadow-xs">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiTotalDeposited')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(totalDepositedAmount)}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFE6CC] border border-[#F7C28E] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiDueFines')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(unpaidFinesTotal)}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#EFE2FF] border border-[#D0B2FB] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-xs">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiSavingsBalance')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(data.member.totalSavings)}
                  </div>
                </div>
              </div>

              {/* 2x2 Overview Widgets matching Image 2 */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Top-Left: My Deposit History */}
                <section className="xl:col-span-6 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-base font-extrabold">
                      <History className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('myDepositHistoryTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('history')}
                      className="text-xs sm:text-sm font-extrabold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  {data.payments.length === 0 ? (
                    <div className="p-6 text-center text-sm sm:text-base font-medium text-slate-500">
                      {t('noRecords')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm sm:text-base">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm">
                            <th className="py-2.5 px-3.5">{t('date')}</th>
                            <th className="py-2.5 px-3">{t('amount')}</th>
                            <th className="py-2.5 px-3.5 text-right">{t('status')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.payments.slice(0, 3).map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3.5 font-semibold tabular-nums text-slate-700 whitespace-nowrap">
                                {formatDate(p.createdAt)}
                              </td>
                              <td className="py-2.5 px-3 font-extrabold tabular-nums text-[#041E5C] whitespace-nowrap">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="py-2.5 px-3.5 text-right">
                                <StatusText status={p.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Top-Right: Our Society Live Overview Card */}
                <section className="xl:col-span-6 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs flex flex-col">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-base font-extrabold">
                      <Building2 className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('mNavOurSociety')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('society')}
                      className="text-xs sm:text-sm font-extrabold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-3">
                        <div className="text-xs font-extrabold text-[#168A3D]">
                          {lang === 'bn' ? 'জমা (সবুজ)' : 'Paid'}
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold text-[#168A3D] tabular-nums mt-0.5">
                          {societySummaryCounts.paid}
                        </div>
                      </div>
                      <div className="rounded-xl bg-amber-50 border border-amber-300 p-3">
                        <div className="text-xs font-extrabold text-amber-800">
                          {lang === 'bn' ? 'বকেয়া' : 'Due'}
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold text-amber-800 tabular-nums mt-0.5">
                          {societySummaryCounts.due + societySummaryCounts.late}
                        </div>
                      </div>
                      <div className="rounded-xl bg-red-50 border-2 border-red-400 p-3">
                        <div className="text-xs font-extrabold text-[#DC2626]">
                          {lang === 'bn' ? 'লেট (লাল)' : 'Late'}
                        </div>
                        <div className="text-xl sm:text-2xl font-extrabold text-[#DC2626] tabular-nums mt-0.5">
                          {societySummaryCounts.late}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('society')}
                      className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#041E5C] hover:bg-navy-800 text-white text-sm font-extrabold cursor-pointer transition-colors"
                    >
                      {lang === 'bn'
                        ? 'সকল সদস্যের হিসাব ও তারিখ দেখুন →'
                        : 'View All Members & Status →'}
                    </button>
                  </div>
                </section>

                {/* Bottom-Left: Investment Proposals & Vote */}
                <section className="xl:col-span-6 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold">
                      <TrendingUp className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('investmentPollCardTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('investments')}
                      className="text-xs font-bold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  <div className="p-4 sm:p-5">
                    {firstPoll ? (
                      <div className="space-y-2.5">
                        <div className="text-sm font-bold text-[#041E5C]">
                          {lang === 'bn' ? firstPoll.questionBn : firstPoll.questionEn}
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span>
                            {firstPollTopOption
                              ? lang === 'bn'
                                ? firstPollTopOption.labelBn
                                : firstPollTopOption.labelEn
                              : t('totalVotes')}
                          </span>
                          <span className="tabular-nums font-bold text-[#168A3D]">
                            {firstPollPct}% ({firstPollVotes} {t('totalVotes')})
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#168A3D] rounded-full transition-all"
                            style={{ width: `${firstPollPct}%` }}
                          />
                        </div>
                      </div>
                    ) : data.investments.length > 0 ? (
                      <div>
                        <div className="text-sm font-bold text-[#041E5C]">
                          {lang === 'bn'
                            ? data.investments[0].titleBn
                            : data.investments[0].titleEn}
                        </div>
                        <div className="text-xs text-slate-600 mt-1 tabular-nums">
                          {t('investedAmount')}:{' '}
                          {formatCurrency(data.investments[0].investedAmount)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-sm text-slate-500 py-3">
                        {t('noRecords')}
                      </div>
                    )}
                  </div>
                </section>

                {/* Bottom-Right: Notice Board */}
                <section className="xl:col-span-6 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold">
                      <Megaphone className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('noticeBoardTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('notices')}
                      className="text-xs font-bold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('viewAllArrow')}
                    </button>
                  </div>
                  <div className="p-4 divide-y divide-slate-100">
                    {data.meetings.length === 0 ? (
                      <div className="py-4 text-center text-sm text-slate-500">
                        {t('noRecords')}
                      </div>
                    ) : (
                      data.meetings.slice(0, 3).map((m) => (
                        <div key={m.id} className="py-2 first:pt-0 last:pb-0 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#168A3D] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-bold text-[#061E54] truncate">
                              {lang === 'bn' ? m.titleBn : m.titleEn}
                            </div>
                            <div className="text-[11px] text-slate-500 tabular-nums">
                              {formatDate(m.date)} · {m.time}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <MembershipRegistrationForm
              mode="member"
              member={data.member}
              defaultMonthlyAmount={data.settings.monthlyDepositAmount}
              onMemberSaved={loadData}
              onToast={showToast}
            />
          )}

          {tab === 'pay' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
                <h2 className="text-xl font-bold text-navy-900">{t('submitPaymentTitle')}</h2>
                <p className="text-sm text-slate-600 mt-1 mb-6">{t('submitPaymentSub')}</p>

                <form onSubmit={handleSubmitPayment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      {t('chooseMethod')}
                    </label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {(
                        [
                          { id: 'bkash', label: t('bkash'), icon: Smartphone },
                          { id: 'nagad', label: t('nagad'), icon: Smartphone },
                          { id: 'bank', label: t('bank'), icon: Building2 },
                        ] as const
                      ).map((opt) => {
                        const Icon = opt.icon;
                        const active = method === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMethod(opt.id)}
                            className={`min-h-[52px] px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              active
                                ? 'bg-[#09328E] text-white border-[#09328E]'
                                : 'bg-white text-navy-900 border-slate-300 hover:border-navy-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${active ? 'text-gold-400' : ''}`} />
                            <span>{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('paymentTypeLabel')}
                      </label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                        className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm bg-white"
                      >
                        <option value="monthly_deposit">{t('monthly_deposit')}</option>
                        <option value="extra_savings">{t('extra_savings')}</option>
                        <option value="fine_payment">{t('fine_payment')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('targetMonthLabel')}
                      </label>
                      <input
                        type="month"
                        required
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('amountBdtLabel')} *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t('senderAccountInput')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={senderAccount}
                        onChange={(e) => setSenderAccount(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('transactionIdInput')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="e.g. 9K7A2B1C4D"
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('uploadScreenshot')}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileToDataUrl(e.target.files?.[0], setScreenshotDataUrl)}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-2.5 file:px-3.5 file:rounded-xl file:border-0 file:bg-slate-100 file:text-navy-900 file:font-semibold"
                    />
                    {screenshotDataUrl && (
                      <img
                        src={screenshotDataUrl}
                        alt="Screenshot preview"
                        className="mt-2 h-24 rounded-lg border border-slate-200 object-contain"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t('noteOptional')}
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-gold-500 hover:bg-gold-400 active:scale-[0.98] disabled:opacity-60 text-navy-950 font-bold text-sm transition-all cursor-pointer"
                  >
                    {t('submitPaymentBtn')}
                  </button>
                </form>
              </div>

              {/* Official Receiving Accounts */}
              <div className="lg:col-span-2 rounded-2xl bg-[#09328E] text-white p-5 sm:p-6 border border-navy-800 h-fit space-y-4">
                <h3 className="text-base font-bold text-gold-400">{t('officialAccountDetails')}</h3>

                {method === 'bkash' && (
                  <div className="rounded-xl bg-navy-950/60 border border-white/10 p-4 space-y-2">
                    <div className="text-xs text-slate-300">
                      {t('bkash')} · {data.settings.bkashAccountType}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-white">
                        {data.settings.bkashNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('bkash', data.settings.bkashNumber)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg bg-navy-800 text-gold-400 text-xs font-semibold cursor-pointer"
                      >
                        {copiedField === 'bkash' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'bkash' ? t('copied') : t('copy')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {method === 'nagad' && (
                  <div className="rounded-xl bg-navy-950/60 border border-white/10 p-4 space-y-2">
                    <div className="text-xs text-slate-300">
                      {t('nagad')} · {data.settings.nagadAccountType}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-lg font-bold text-white">
                        {data.settings.nagadNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('nagad', data.settings.nagadNumber)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg bg-navy-800 text-gold-400 text-xs font-semibold cursor-pointer"
                      >
                        {copiedField === 'nagad' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'nagad' ? t('copied') : t('copy')}</span>
                      </button>
                    </div>
                  </div>
                )}

                {method === 'bank' && (
                  <div className="rounded-xl bg-navy-950/60 border border-white/10 p-4 space-y-2 text-sm">
                    <div className="font-bold text-white">{data.settings.bankName}</div>
                    <div className="text-xs text-slate-300">{data.settings.bankAccountName}</div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-mono text-base font-bold text-gold-400">
                        {data.settings.bankAccountNumber}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('bank', data.settings.bankAccountNumber)}
                        className="inline-flex items-center gap-1 min-h-[36px] px-3 rounded-lg bg-navy-800 text-gold-400 text-xs font-semibold cursor-pointer"
                      >
                        {copiedField === 'bank' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'bank' ? t('copied') : t('copy')}</span>
                      </button>
                    </div>
                    <div className="text-xs text-slate-300 pt-1">
                      {data.settings.bankBranch} · Routing: {data.settings.bankRoutingNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{t('historyTitle')}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{t('historySub')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectTab('pay')}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-[#168A3D] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <HandCoins className="w-4 h-4" />
                  <span>{t('payNowAction')}</span>
                </button>
              </div>

              <div className="flex flex-wrap sm:inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                {(['all', 'approved', 'pending', 'rejected'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHistoryFilter(s)}
                    className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap ${
                      historyFilter === s ? 'bg-[#168A3D] text-white' : 'text-slate-600'
                    }`}
                  >
                    {t(s)}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                {filteredHistory.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">{t('noRecords')}</div>
                ) : (
                  <>
                    {/* Mobile Touch Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredHistory.map((p) => (
                        <div key={p.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-navy-900">
                                {t(p.paymentType)}
                              </div>
                              <div className="text-xs text-slate-500 tabular-nums mt-0.5">
                                {p.month} · {formatDate(p.createdAt)}
                              </div>
                            </div>
                            <StatusText status={p.status} />
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-navy-900">
                                {t(p.method)}
                              </div>
                              <div className="font-mono text-xs text-slate-600 truncate mt-0.5">
                                {p.transactionId}
                              </div>
                            </div>
                            <div className="text-base font-bold text-navy-900 tabular-nums shrink-0">
                              {formatCurrency(p.amount)}
                            </div>
                          </div>

                          {p.rejectionReason && (
                            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                              {p.rejectionReason}
                            </div>
                          )}

                          {p.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => downloadReceiptPdf(p, data.settings)}
                              className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-[#09328E] hover:bg-navy-800 active:scale-[0.98] text-white text-xs font-bold cursor-pointer"
                            >
                              <FileDown className="w-4 h-4 text-gold-400" />
                              <span>{t('downloadReceipt')}</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">{t('date')}</th>
                            <th className="py-3 px-4">{t('paymentTypeLabel')}</th>
                            <th className="py-3 px-4">{t('method')}</th>
                            <th className="py-3 px-4">{t('trxIdLabel')}</th>
                            <th className="py-3 px-4 text-right">{t('amount')}</th>
                            <th className="py-3 px-4">{t('status')}</th>
                            <th className="py-3 px-4 text-right">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredHistory.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                                {formatDate(p.createdAt)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-navy-900">
                                  {t(p.paymentType)}
                                </div>
                                <div className="text-xs text-slate-500">{p.month}</div>
                              </td>
                              <td className="py-3 px-4">{t(p.method)}</td>
                              <td className="py-3 px-4 font-mono text-xs">{p.transactionId}</td>
                              <td className="py-3 px-4 text-right font-bold text-navy-900 tabular-nums">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <StatusText status={p.status} />
                                {p.rejectionReason && (
                                  <div className="text-xs text-red-600 mt-0.5">
                                    {p.rejectionReason}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {p.status === 'approved' && (
                                  <button
                                    type="button"
                                    onClick={() => downloadReceiptPdf(p, data.settings)}
                                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-[#09328E] hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
                                  >
                                    <FileDown className="w-3.5 h-3.5 text-gold-400" />
                                    <span>{t('downloadReceipt')}</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'statements' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy-900">{t('mNavStatements')}</h2>
                <p className="text-sm text-slate-600 mt-0.5">
                  {t('annualDepositTracker')} · {currentYear}
                </p>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {monthsOfYear.map((m) => (
                    <div
                      key={m.ym}
                      className={`rounded-xl border p-3 text-center ${
                        m.status === 'approved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : m.status === 'pending'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="text-sm font-bold">{m.label}</div>
                      <div className="text-xs mt-1 font-semibold">
                        {m.status === 'approved'
                          ? t('paid')
                          : m.status === 'pending'
                          ? t('pending')
                          : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'receipts' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy-900">{t('mNavReceipts')}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{t('historySub')}</p>
              </div>

              {approvedReceipts.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
                  {t('noRecords')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedReceipts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-[#09328E]">
                          {p.receiptNumber || p.transactionId}
                        </div>
                        <div className="text-sm font-bold text-[#041E5C] mt-0.5">
                          {t(p.paymentType)} · {p.month}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {formatDate(p.createdAt)} · {formatCurrency(p.amount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadReceiptPdf(p, data.settings)}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#09328E] hover:bg-navy-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <FileDown className="w-4 h-4 text-[#FFD426]" />
                        <span>{t('downloadReceipt')}</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'investments' && (
            <div className="space-y-8">
              <section className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{t('memberInvestmentsTitle')}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{t('memberInvestmentsSub')}</p>
                </div>
                {data.investments.length === 0 ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
                    {t('noRecords')}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {data.investments.map((inv) => (
                      <div key={inv.id} className="rounded-xl bg-white border border-slate-200 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-500">
                              {inv.category} · {formatDate(inv.startDate)}
                            </div>
                            <h3 className="text-base font-bold text-navy-900 mt-1">
                              {lang === 'bn' ? inv.titleBn : inv.titleEn}
                            </h3>
                          </div>
                          <StatusText status={inv.status} />
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {lang === 'bn' ? inv.descriptionBn || inv.descriptionEn : inv.descriptionEn}
                        </p>
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
                          <div>
                            <p className="text-xs text-slate-500">{t('investedAmount')}</p>
                            <p className="text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                              {formatCurrency(inv.investedAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{t('expectedReturnRate')}</p>
                            <p className="text-sm font-bold text-gold-600 tabular-nums mt-0.5">
                              {inv.expectedReturnRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">{t('actualReturnAmount')}</p>
                            <p className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
                              {formatCurrency(inv.actualReturnAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold text-navy-900">{t('memberVotingTitle')}</h2>
                {data.polls.length === 0 ? (
                  <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
                    {t('noRecords')}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.polls.map((poll) => {
                      const hasVoted = poll.votedMemberIds.includes(data.member.id);
                      const total = poll.options.reduce((s, o) => s + o.votes, 0);
                      return (
                        <div key={poll.id} className="rounded-xl bg-white border border-slate-200 p-5">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                              <div className="text-xs text-slate-500">
                                {t('deadline')}: {formatDate(poll.deadline)} · {total}{' '}
                                {t('totalVotes')}
                              </div>
                              <h3 className="text-base font-bold text-navy-900 mt-1">
                                {lang === 'bn' ? poll.questionBn : poll.questionEn}
                              </h3>
                            </div>
                            <StatusText status={poll.status} />
                          </div>

                          <div className="space-y-2.5">
                            {poll.options.map((opt) => {
                              const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                              return (
                                <div key={opt.id} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-navy-900">
                                      {lang === 'bn' ? opt.labelBn : opt.labelEn}
                                    </span>
                                    {poll.status === 'open' && !hasVoted ? (
                                      <button
                                        type="button"
                                        onClick={() => handleVote(poll.id, opt.id)}
                                        className="min-h-[36px] px-3 py-1 rounded-lg bg-[#09328E] hover:bg-navy-800 text-white text-xs font-semibold cursor-pointer"
                                      >
                                        {t('castVote')}
                                      </button>
                                    ) : (
                                      <span className="text-xs font-semibold tabular-nums text-slate-600">
                                        {opt.votes} ({pct}%)
                                      </span>
                                    )}
                                  </div>
                                  {(hasVoted || poll.status === 'closed') && (
                                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                      <div
                                        className="h-full bg-[#168A3D] rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === 'notices' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-navy-900">{t('memberNoticesTitle')}</h2>
              {data.meetings.length === 0 ? (
                <div className="rounded-xl bg-white border border-slate-200 p-8 text-center text-sm text-slate-500">
                  {t('noRecords')}
                </div>
              ) : (
                <div className="space-y-4">
                  {data.meetings.map((m) => (
                    <div key={m.id} className="rounded-xl bg-white border border-slate-200 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">
                            {formatDate(m.date)} · {m.time} · {m.location}
                          </div>
                          <h3 className="text-base font-bold text-navy-900 mt-1">
                            {lang === 'bn' ? m.titleBn : m.titleEn}
                          </h3>
                        </div>
                        <StatusText status={m.status} />
                      </div>
                      {(m.agendaEn || m.agendaBn) && (
                        <p className="text-sm text-slate-600 mt-2.5">
                          {lang === 'bn' ? m.agendaBn || m.agendaEn : m.agendaEn}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'society' && (
            <OurSocietyView
              members={data.societyMembers || []}
              payments={data.societyPayments || []}
              fines={data.societyFines || []}
              settings={data.settings}
              highlightMemberId={data.member.id}
            />
          )}

          {tab === 'rules' && (
            <div className="space-y-5">
              <SocietyRulesView />
              <SocietyRulesFooter />
            </div>
          )}

          {tab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-navy-900">{t('mNavSettings')}</h2>
                <p className="text-sm sm:text-base font-medium text-slate-600 mt-0.5">{t('profileSub')}</p>
              </div>

              {/* Member Profile Photo Card inside Settings */}
              <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {data.member.avatarDataUrl ? (
                    <img
                      src={data.member.avatarDataUrl}
                      alt={data.member.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#09328E] shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#09328E] to-blue-700 border-2 border-[#F5C518] flex items-center justify-center text-white shrink-0">
                      <User className="w-7 h-7 text-[#FFD426]" />
                    </div>
                  )}
                  <div>
                    <div className="text-base font-extrabold text-navy-900">
                      {data.member.name || data.member.memberId}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-slate-600">
                      {lang === 'bn'
                        ? 'আপনার যেকোনো ছবি প্রোফাইলে ব্যবহার করতে পারবেন'
                        : 'Upload any photo for your member profile'}
                    </div>
                  </div>
                </div>
                <label className="min-h-[44px] px-4 py-2 rounded-xl bg-[#09328E] hover:bg-navy-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0">
                  <Camera className="w-4 h-4 text-[#FFD426]" />
                  <span>
                    {uploadingAvatar
                      ? lang === 'bn'
                        ? 'আপলোড হচ্ছে...'
                        : 'Uploading...'
                      : lang === 'bn'
                      ? 'ছবি পরিবর্তন / আপলোড'
                      : 'Upload / Change Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    onChange={(e) => handleQuickAvatarChange(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* App Language & Sign Out inside Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Globe className="w-5 h-5 text-[#09328E] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-extrabold text-navy-900 truncate">
                        {t('languagePreferenceTitle')}
                      </div>
                      <div className="text-xs font-medium text-slate-500">{t('languageLabel')}</div>
                    </div>
                  </div>
                  <LanguageToggle variant="light" />
                </div>

                <div className="rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-extrabold text-navy-900">{t('accountLogoutTitle')}</div>
                    <div className="text-xs font-mono text-slate-500 truncate">
                      {data.member.email || data.member.memberId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>

              <form
                onSubmit={handlePasswordChange}
                className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">{t('memberIdBadge')}</div>
                    <div className="font-mono text-base font-extrabold text-navy-900">
                      {data.member.memberId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectTab('profile')}
                    className="text-sm font-extrabold text-[#09328E] hover:underline cursor-pointer"
                  >
                    {t('mNavMyProfile')} →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      {t('currentPassword')}
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">
                      {t('newPassword')}
                    </label>
                    <input
                      type="password"
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base font-semibold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#09328E] hover:bg-navy-800 text-white text-sm sm:text-base font-bold cursor-pointer"
                  >
                    {t('changePasswordBtn')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
