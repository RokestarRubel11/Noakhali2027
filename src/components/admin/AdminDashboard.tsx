import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  CreditCard,
  Eye,
  FileBarChart2,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  Vote,
  Wallet,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { ApiError, apiRequest, getAdminToken, setAdminToken } from '../../lib/api.ts';
import type {
  AdminOverviewResponse,
  MemberPublic,
  PaymentSubmission,
} from '../../types.ts';
import { OurSocietyView } from '../OurSocietyView.tsx';
import type { NotificationItem } from '../SocietyHeaderBanner.tsx';
import { SocietyRulesFooter, SocietyRulesView } from '../SocietyRulesSection.tsx';
import { SocietyCrest, StatusText } from '../StatusText.tsx';
import {
  AdminGovernanceView,
  AdminInvestmentsView,
  AdminLedgerView,
  AdminReportsView,
  AdminSettingsView,
} from './AdminSubViews.tsx';

type AdminTab =
  | 'overview'
  | 'members'
  | 'payments'
  | 'fines'
  | 'society'
  | 'ledger'
  | 'investments'
  | 'governance'
  | 'reports'
  | 'notices'
  | 'rules'
  | 'settings';

export function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { lang, t, formatCurrency, formatDate } = useLanguage();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Search & filters
  const [memberQuery, setMemberQuery] = useState('');
  const [memberRegFilter, setMemberRegFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>(
    'pending'
  );

  // Member add modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [mName, setMName] = useState('');
  const [mEmail, setMEmail] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mAddress, setMAddress] = useState('');
  const [mNid, setMNid] = useState('');
  const [mTarget, setMTarget] = useState('5000');
  const [mPassword, setMPassword] = useState('');

  // Reject payment modal
  const [rejectTarget, setRejectTarget] = useState<PaymentSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fine modal
  const [showAddFine, setShowAddFine] = useState(false);
  const [fineMemberId, setFineMemberId] = useState('');
  const [fineReason, setFineReason] = useState('');
  const [fineAmount, setFineAmount] = useState('');
  const [fineDueDate, setFineDueDate] = useState(new Date().toISOString().slice(0, 10));

  // Notice modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [nTitleEn, setNTitleEn] = useState('');
  const [nTitleBn, setNTitleBn] = useState('');
  const [nDate, setNDate] = useState(new Date().toISOString().slice(0, 10));
  const [nTime, setNTime] = useState('19:30');
  const [nLocation, setNLocation] = useState('');
  const [nAgendaEn, setNAgendaEn] = useState('');
  const [nAgendaBn, setNAgendaBn] = useState('');

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setError('');
    try {
      const res = await apiRequest<AdminOverviewResponse>('/api/admin/overview', {
        token: getAdminToken(),
      });
      setData(res);
      setMTarget(String(res.settings.monthlyDepositAmount));
      setFineAmount(String(res.settings.defaultLateFine));
      if (res.members.length > 0) {
        setFineMemberId((prev) => prev || res.members[0].id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load admin dashboard';
      setError(msg);
      if (
        (err instanceof ApiError && (err.status === 401 || err.status === 403)) ||
        msg.includes('401') ||
        msg.includes('403') ||
        msg.toLowerCase().includes('forbidden') ||
        msg.toLowerCase().includes('authentication')
      ) {
        setAdminToken(null);
        onLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSignOut = () => {
    setAdminToken(null);
    onLogout();
  };

  const handleSelectTab = (nextTab: AdminTab) => {
    setTab(nextTab);
    setMobileMenuOpen(false);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/members', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          name: mName,
          email: mEmail,
          phone: mPhone,
          address: mAddress,
          nid: mNid,
          monthlyTarget: Number(mTarget),
          password: mPassword,
        }),
      });
      setShowAddMember(false);
      setMName('');
      setMEmail('');
      setMPhone('');
      setMAddress('');
      setMNid('');
      setMPassword('');
      await loadData();
      showToast(t('save'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleApproveMemberAccount = async (m: MemberPublic) => {
    try {
      await apiRequest(`/api/admin/members/${m.id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status: 'active' }),
      });
      await loadData();
      showToast(
        lang === 'bn'
          ? 'সদস্য আইডি অনুমোদিত হয়েছে — এখন লগইন করতে পারবেন'
          : 'Member ID approved — member can now sign in'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleToggleMemberStatus = async (m: MemberPublic) => {
    const nextStatus = m.status === 'active' ? 'suspended' : 'active';
    try {
      await apiRequest(`/api/admin/members/${m.id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleRegistrationDecision = async (
    m: MemberPublic,
    registrationStatus: 'approved' | 'rejected'
  ) => {
    try {
      await apiRequest(`/api/admin/members/${m.id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ registrationStatus }),
      });
      await loadData();
      showToast(
        registrationStatus === 'approved' ? t('regStatusApproved') : t('regStatusRejected')
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleVerifyPayment = async (
    payment: PaymentSubmission,
    action: 'approve' | 'reject',
    rejectionReason?: string
  ) => {
    try {
      await apiRequest(`/api/admin/payments/${payment.id}/verify`, {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({ action, rejectionReason }),
      });
      setRejectTarget(null);
      setRejectReason('');
      await loadData();
      showToast(action === 'approve' ? t('approved') : t('rejected'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleCreateFine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/fines', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          memberDocId: fineMemberId,
          reason: fineReason,
          amount: Number(fineAmount),
          dueDate: fineDueDate,
        }),
      });
      setShowAddFine(false);
      setFineReason('');
      await loadData();
      showToast(t('save'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleFineAction = async (id: string, status: 'paid' | 'waived') => {
    try {
      await apiRequest(`/api/admin/fines/${id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status }),
      });
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/meetings', {
        method: 'POST',
        token: getAdminToken(),
        body: JSON.stringify({
          titleEn: nTitleEn || nTitleBn,
          titleBn: nTitleBn || nTitleEn,
          date: nDate,
          time: nTime,
          location: nLocation,
          agendaEn: nAgendaEn || nAgendaBn,
          agendaBn: nAgendaBn || nAgendaEn,
        }),
      });
      setShowNoticeModal(false);
      setNTitleEn('');
      setNTitleBn('');
      setNLocation('');
      setNAgendaEn('');
      setNAgendaBn('');
      await loadData();
      showToast(t('save'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const handleCompleteNotice = async (id: string) => {
    try {
      await apiRequest(`/api/admin/meetings/${id}`, {
        method: 'PATCH',
        token: getAdminToken(),
        body: JSON.stringify({ status: 'completed' }),
      });
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', true);
    }
  };

  const navItems: {
    id: AdminTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'overview',
      label: lang === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'members',
      label: t('navMembers'),
      icon: Users,
      badge: data
        ? data.members.filter(
            (m) =>
              m.status === 'pending' ||
              (m.registrationStatus || (m.registrationCompleted ? 'approved' : 'unsubmitted')) ===
                'pending'
          ).length
        : 0,
    },
    {
      id: 'payments',
      label: lang === 'bn' ? 'মাসিক জমা' : t('navPayments'),
      icon: CreditCard,
      badge: data?.stats.pendingPaymentsCount || 0,
    },
    { id: 'fines', label: lang === 'bn' ? 'জরিমানা' : 'Fines', icon: AlertTriangle },
    {
      id: 'society',
      label: t('navOurSociety'),
      icon: Building2,
    },
    { id: 'ledger', label: lang === 'bn' ? 'আয়-ব্যয়' : t('navLedger'), icon: BookOpen },
    {
      id: 'investments',
      label: lang === 'bn' ? 'বিনিয়োগ প্রস্তাব' : t('navInvestments'),
      icon: TrendingUp,
    },
    { id: 'governance', label: lang === 'bn' ? 'ভোট/অনুমোদন' : t('navGovernance'), icon: Vote },
    { id: 'reports', label: lang === 'bn' ? 'রিপোর্ট' : 'Reports', icon: FileBarChart2 },
    { id: 'notices', label: t('navNotices'), icon: Megaphone },
    { id: 'rules', label: t('navRules'), icon: FileText },
    { id: 'settings', label: t('navSettings'), icon: Settings },
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
        <p className="text-sm text-red-700 mb-4">{error || 'Unable to load Admin Dashboard'}</p>
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

  const pendingAccountMembers = data.members.filter((m) => m.status === 'pending');

  const pendingRegistrationMembers = data.members.filter(
    (m) => (m.registrationStatus || (m.registrationCompleted ? 'approved' : 'unsubmitted')) === 'pending'
  );

  const pendingMembersTotalCount = data.members.filter(
    (m) =>
      m.status === 'pending' ||
      (m.registrationStatus || (m.registrationCompleted ? 'approved' : 'unsubmitted')) === 'pending'
  ).length;

  const notifications: NotificationItem[] = [
    ...pendingAccountMembers.slice(0, 4).map((m) => ({
      id: `acc-${m.id}`,
      title: `${m.name || m.email} (${m.memberId})`,
      meta: lang === 'bn' ? 'নতুন আইডি অনুমোদনের অপেক্ষায়' : 'New ID awaiting approval',
      onClick: () => {
        setMemberRegFilter('pending');
        handleSelectTab('members');
      },
    })),
    ...pendingRegistrationMembers.slice(0, 4).map((m) => ({
      id: `reg-${m.id}`,
      title: `${m.name || m.email} (${m.memberId})`,
      meta: t('regStatusPending'),
      onClick: () => {
        setMemberRegFilter('pending');
        handleSelectTab('members');
      },
    })),
    ...data.payments
      .filter((p) => p.status === 'pending')
      .slice(0, 6)
      .map((p) => ({
        id: p.id,
        title: `${p.memberName} (${p.memberId}) · ${formatCurrency(p.amount)}`,
        meta: `${t(p.method)} · ${p.transactionId} · ${t('pending')}`,
        onClick: () => handleSelectTab('payments'),
      })),
  ];

  // 6-month savings chart series + 3-month deposit status table
  const now = new Date();
  const sixMonthSeries = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { month: 'short' });
    const fullLabel = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
    const monthPayments = data.payments.filter(
      (p) => p.status === 'approved' && p.month === ym && p.paymentType !== 'fine_payment'
    );
    const monthTotal = monthPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { ym, label, fullLabel, total: monthTotal, count: monthPayments.length };
  });

  const maxChartVal = Math.max(5000, ...sixMonthSeries.map((s) => s.total));
  const totalMemberBase = Math.max(data.members.length, 1);
  const last3MonthsStatus = [...sixMonthSeries]
    .slice(-3)
    .reverse()
    .map((m) => {
      const targetAmount = data.members.reduce(
        (sum, mem) => sum + Number(mem.monthlyTarget || data.settings.monthlyDepositAmount),
        0
      );
      const dueAmount = Math.max(0, targetAmount - m.total);
      const pct = targetAmount > 0 ? Math.min(100, Math.round((m.total / targetAmount) * 100)) : 0;
      return {
        ...m,
        memberCount: data.members.length,
        depositedAmount: m.total,
        dueAmount,
        pct,
        paidCount: m.count,
      };
    });

  // Combined pending approval items for overview card
  const pendingApprovalItems = [
    ...pendingAccountMembers.map((m) => ({
      id: `acc-${m.id}`,
      typeLabel: lang === 'bn' ? 'নতুন আইডি অনুমোদন' : 'New ID Approval',
      applicant: m.name || m.email,
      date: m.joinedAt,
      badgeColor: 'bg-emerald-600',
      onClick: () => {
        setMemberRegFilter('pending');
        handleSelectTab('members');
      },
    })),
    ...data.payments
      .filter((p) => p.status === 'pending')
      .map((p) => ({
        id: p.id,
        typeLabel: lang === 'bn' ? 'মাসিক জমা' : 'Deposit',
        applicant: p.memberName,
        date: p.createdAt,
        badgeColor: 'bg-blue-700',
        onClick: () => {
          setPaymentFilter('pending');
          handleSelectTab('payments');
        },
      })),
    ...pendingRegistrationMembers.map((m) => ({
      id: m.id,
      typeLabel: lang === 'bn' ? 'সদস্য নিবন্ধন' : 'Registration',
      applicant: m.name || m.email,
      date: m.joinedAt,
      badgeColor: 'bg-amber-600',
      onClick: () => {
        setMemberRegFilter('pending');
        handleSelectTab('members');
      },
    })),
  ];

  const getRegStatus = (m: MemberPublic) =>
    m.registrationStatus || (m.registrationCompleted ? 'approved' : 'unsubmitted');

  const filteredMembers = data.members.filter((m) => {
    const regSt = getRegStatus(m);
    if (memberRegFilter === 'pending' && m.status !== 'pending' && regSt !== 'pending') return false;
    if (memberRegFilter === 'approved' && regSt !== 'approved') return false;
    const q = memberQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.memberId.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  const filteredPayments = data.payments.filter((p) =>
    paymentFilter === 'all' ? true : p.status === paymentFilter
  );

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
              className={`w-full min-h-[44px] px-3 py-2.5 rounded-lg flex items-center justify-between gap-2 text-sm sm:text-[15px] font-extrabold transition-colors cursor-pointer ${
                active
                  ? 'bg-[#168A3D] text-white shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-blue-200'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {Boolean(item.badge && item.badge > 0) && (
                <span className="px-2 py-0.5 rounded-md bg-[#FFD426] text-[#041E5C] text-xs font-extrabold tabular-nums shrink-0">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
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
              <ShieldCheck className="w-4 h-4 text-[#FFD426]" />
              <span>ADMIN PAGE</span>
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

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-[#FFD426]" />
              <span>Admin</span>
            </div>
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
            <div className="space-y-5">
              {/* 5 Pastel KPI Cards matching Image 2 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                <div className="rounded-2xl bg-[#DDF0FF] border border-[#A8D1FA] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-white text-[#145CE0] flex items-center justify-center shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiTotalMembers')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {data.stats.totalMembers} {lang === 'bn' ? 'জন' : ''}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#DDF7E8] border border-[#9FE0BA] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#168A3D] text-white flex items-center justify-center shadow-xs">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiTotalSavings')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(data.stats.totalSavings)}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#EFE2FF] border border-[#D0B2FB] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#7C3AED] text-white flex items-center justify-center shadow-xs">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiThisMonthDeposits')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(data.stats.thisMonthDeposits)}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFE6CC] border border-[#F7C28E] p-4 text-center shadow-xs">
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
                    <Gavel className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('kpiFines')}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#041E5C] tabular-nums mt-0.5">
                    {formatCurrency(data.stats.unpaidFinesAmount)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectTab('society')}
                  className="col-span-2 sm:col-span-1 rounded-2xl bg-[#D9F4E5] hover:bg-[#CBEFD9] border border-[#96DAB5] p-4 text-center shadow-xs cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-full bg-[#168A3D] text-white flex items-center justify-center shadow-xs">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="text-xs sm:text-sm font-extrabold text-[#061E54]">
                    {t('navOurSociety')}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-[#168A3D] mt-1">
                    {lang === 'bn' ? 'সদস্য হিসাব দেখুন →' : 'View Ledger →'}
                  </div>
                </button>
              </div>

              {/* Row 2: Monthly Deposit Status Table + Member List Table */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <section className="xl:col-span-7 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-base font-extrabold">
                      <CalendarCheck className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('monthlyDepositStatusTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('payments')}
                      className="text-xs sm:text-sm font-extrabold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm sm:text-base">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm">
                          <th className="py-2.5 px-3.5">{t('month')}</th>
                          <th className="py-2.5 px-3 text-center">{t('membersCountCol')}</th>
                          <th className="py-2.5 px-3 text-right">{t('depositedCountCol')}</th>
                          <th className="py-2.5 px-3 text-right">{t('remainingCol')}</th>
                          <th className="py-2.5 px-3.5 text-right">{t('percentageCol')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {last3MonthsStatus.map((row) => (
                          <tr key={row.ym} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3.5 font-semibold text-[#061E54] whitespace-nowrap">
                              {row.fullLabel}
                            </td>
                            <td className="py-2.5 px-3 text-center tabular-nums font-semibold">
                              {row.memberCount}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(row.depositedAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-700 whitespace-nowrap">
                              {formatCurrency(row.dueAmount)}
                            </td>
                            <td className="py-2.5 px-3.5 text-right tabular-nums font-bold text-[#041E5C]">
                              {row.pct}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="xl:col-span-5 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-base font-extrabold">
                      <Users className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('memberListTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('members')}
                      className="text-xs sm:text-sm font-extrabold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm">
                          <th className="py-2.5 px-3">{t('serialCol')}</th>
                          <th className="py-2.5 px-3">{t('fullName')}</th>
                          <th className="py-2.5 px-3">{t('phoneNumber')}</th>
                          <th className="py-2.5 px-3 text-right">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.members.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 text-center text-slate-500">
                              {t('noRecords')}
                            </td>
                          </tr>
                        ) : (
                          data.members.slice(0, 4).map((m, idx) => (
                            <tr key={m.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#061E54] max-w-[165px]">
                                <div className="flex items-center gap-2 min-w-0">
                                  {m.avatarDataUrl ? (
                                    <img
                                      src={m.avatarDataUrl}
                                      alt={m.name || m.memberId}
                                      className="w-7 h-7 rounded-full object-cover border border-[#09328E] shrink-0"
                                    />
                                  ) : (
                                    <span className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                      <User className="w-3.5 h-3.5 text-slate-500" />
                                    </span>
                                  )}
                                  <span className="truncate">{m.name || m.email}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                                {m.phone || '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-md text-xs font-extrabold ${
                                    m.status === 'active'
                                      ? 'bg-[#168A3D] text-white'
                                      : m.status === 'pending'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {t(m.status)}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Row 3: 6-Month Bar Chart + Pending Approvals Queue */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <section className="xl:col-span-7 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-2.5 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#FFD426]" />
                    <h3 className="text-sm font-extrabold">{t('savingsGrowthChartTitle')}</h3>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 pb-2 border-b border-slate-200">
                      {sixMonthSeries.map((pt) => {
                        const heightPct = Math.max(8, Math.round((pt.total / maxChartVal) * 100));
                        const shortLabel =
                          pt.total >= 1000
                            ? `${(pt.total / 1000).toFixed(1).replace(/\.0$/, '')}k`
                            : `${pt.total}`;
                        return (
                          <div
                            key={pt.ym}
                            className="flex-1 flex flex-col items-center justify-end h-full gap-1.5"
                          >
                            <span className="text-[11px] font-bold text-[#041E5C] tabular-nums">
                              {shortLabel}
                            </span>
                            <div
                              className="w-full max-w-[46px] rounded-t-lg bg-gradient-to-t from-[#06399E] to-[#1D74F5] transition-all shadow-xs"
                              style={{ height: `${heightPct}%` }}
                              title={`${pt.fullLabel}: ${formatCurrency(pt.total)}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:gap-4 pt-2">
                      {sixMonthSeries.map((pt) => (
                        <div
                          key={pt.ym}
                          className="flex-1 text-center text-xs font-bold text-slate-600 truncate"
                        >
                          {pt.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="xl:col-span-5 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-gradient-to-r from-[#0C6E33] to-[#168A3D] text-white px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2 text-sm font-extrabold">
                      <CheckCircle2 className="w-4 h-4 text-[#FFD426]" />
                      <span>{t('pendingApprovalsTitle')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectTab('payments')}
                      className="text-xs font-bold text-white/95 hover:text-[#FFD426] cursor-pointer whitespace-nowrap"
                    >
                      {t('seeFullArrow')}
                    </button>
                  </div>
                  {pendingApprovalItems.length === 0 ? (
                    <div className="p-8 text-center text-xs sm:text-sm text-slate-500">
                      {t('noPendingApprovals')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                            <th className="py-2.5 px-3.5">{t('requestTypeCol')}</th>
                            <th className="py-2.5 px-3">{t('applicantCol')}</th>
                            <th className="py-2.5 px-3.5 text-right">{t('date')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingApprovalItems.slice(0, 5).map((item) => (
                            <tr
                              key={item.id}
                              onClick={item.onClick}
                              className="hover:bg-sky-50/60 cursor-pointer"
                            >
                              <td className="py-2.5 px-3.5 font-bold text-[#061E54] whitespace-nowrap">
                                <span className="inline-flex items-center gap-2">
                                  <span
                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.badgeColor}`}
                                  />
                                  <span>{item.typeLabel}</span>
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-medium text-slate-700 truncate max-w-[140px]">
                                {item.applicant}
                              </td>
                              <td className="py-2.5 px-3.5 text-right text-xs text-slate-500 tabular-nums whitespace-nowrap">
                                {formatDate(item.date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{t('memberDirectory')}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{t('memberDirectorySub')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#09328E] hover:bg-navy-800 text-white text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('addMemberBtn')}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative max-w-md w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-base sm:text-sm focus:outline-none focus:border-navy-700"
                  />
                </div>

                <div className="flex flex-wrap sm:inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                  {(
                    [
                      { id: 'all', label: t('all') },
                      {
                        id: 'pending',
                        label: `${t('pendingApprovalsFilter')}${
                          pendingMembersTotalCount > 0 ? ` (${pendingMembersTotalCount})` : ''
                        }`,
                      },
                      { id: 'approved', label: t('approved') },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setMemberRegFilter(f.id)}
                      className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        memberRegFilter === f.id
                          ? 'bg-[#168A3D] text-white'
                          : 'text-slate-600 hover:text-navy-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                {filteredMembers.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">{t('noRecords')}</div>
                ) : (
                  <>
                    {/* Mobile Touch Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredMembers.map((m) => {
                        const regStatus = getRegStatus(m);
                        return (
                          <div key={m.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3 min-w-0">
                                {m.avatarDataUrl ? (
                                  <img
                                    src={m.avatarDataUrl}
                                    alt={m.name || m.memberId}
                                    className="w-11 h-11 rounded-full object-cover border-2 border-[#09328E] shrink-0"
                                  />
                                ) : (
                                  <span className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-slate-500" />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-extrabold text-navy-800">
                                    {m.memberId}
                                  </div>
                                  <div className="text-base sm:text-lg font-extrabold text-navy-900 truncate mt-0.5">
                                    {m.name || m.email || '—'}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <StatusText status={m.status} />
                                <span
                                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                    regStatus === 'approved'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : regStatus === 'pending'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : regStatus === 'rejected'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {regStatus === 'approved'
                                    ? t('regStatusApproved')
                                    : regStatus === 'pending'
                                    ? t('regStatusPending')
                                    : regStatus === 'rejected'
                                    ? t('regStatusRejected')
                                    : t('regStatusUnsubmitted')}
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-slate-600 space-y-1">
                              {m.phone && (
                                <div>
                                  <a
                                    href={`tel:${m.phone}`}
                                    className="inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:underline"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                    <span>{m.phone}</span>
                                  </a>
                                </div>
                              )}
                              {m.email && <div className="truncate text-slate-500">{m.email}</div>}
                              {(m.nid || m.nomineeName || m.address) && (
                                <div className="text-[11px] text-slate-500 pt-1">
                                  {m.nid && <span>NID: {m.nid} · </span>}
                                  {m.nomineeName && (
                                    <span>
                                      {t('nomineeName')}: {m.nomineeName}
                                    </span>
                                  )}
                                  {m.address && <div className="truncate">{m.address}</div>}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3">
                              <div>
                                <div className="text-[11px] text-slate-500">{t('monthlyTargetCol')}</div>
                                <div className="text-sm font-bold text-navy-900 tabular-nums mt-0.5">
                                  {formatCurrency(m.monthlyTarget)}
                                </div>
                              </div>
                              <div>
                                <div className="text-[11px] text-slate-500">{t('totalSavingsCol')}</div>
                                <div className="text-sm font-bold text-emerald-700 tabular-nums mt-0.5">
                                  {formatCurrency(m.totalSavings)}
                                </div>
                              </div>
                            </div>

                            {m.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleApproveMemberAccount(m)}
                                className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#0D7A32] to-[#169C43] hover:brightness-105 active:scale-[0.99] text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                              >
                                <UserCheck className="w-4 h-4 shrink-0" />
                                <span>
                                  {lang === 'bn' ? 'আইডি অনুমোদন করুন' : 'Approve Member ID'}
                                </span>
                              </button>
                            )}

                            {m.status === 'active' && regStatus !== 'approved' && (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRegistrationDecision(m, 'approved')}
                                  className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  <span>{t('approveRegistrationBtn')}</span>
                                </button>
                                {regStatus === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => handleRegistrationDecision(m, 'rejected')}
                                    className="min-h-[42px] px-3 py-2 rounded-xl border border-red-300 bg-red-50/50 text-red-700 text-xs font-bold cursor-pointer"
                                  >
                                    {t('rejectRegistrationBtn')}
                                  </button>
                                )}
                              </div>
                            )}

                            {m.status !== 'pending' && (
                              <button
                                type="button"
                                onClick={() => handleToggleMemberStatus(m)}
                                className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 hover:border-navy-700 active:scale-[0.99] text-xs font-bold text-navy-900 cursor-pointer"
                              >
                                {m.status === 'active' ? t('suspendBtn') : t('activateBtn')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-extrabold text-slate-700">
                            <th className="py-3 px-4">{t('memberIdCol')}</th>
                            <th className="py-3 px-4">{t('fullName')}</th>
                            <th className="py-3 px-4">{t('contactCol')}</th>
                            <th className="py-3 px-4">{t('mNavRegistration')}</th>
                            <th className="py-3 px-4 text-right">{t('totalSavingsCol')}</th>
                            <th className="py-3 px-4">{t('status')}</th>
                            <th className="py-3 px-4 text-right">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm sm:text-base">
                          {filteredMembers.map((m) => {
                            const regStatus = getRegStatus(m);
                            return (
                              <tr key={m.id} className="hover:bg-slate-50/70">
                                <td className="py-3 px-4 font-mono text-xs sm:text-sm font-bold text-navy-800 whitespace-nowrap">
                                  {m.memberId}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    {m.avatarDataUrl ? (
                                      <img
                                        src={m.avatarDataUrl}
                                        alt={m.name || m.memberId}
                                        className="w-9 h-9 rounded-full object-cover border border-[#09328E] shrink-0"
                                      />
                                    ) : (
                                      <span className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                        <User className="w-4 h-4 text-slate-500" />
                                      </span>
                                    )}
                                    <div>
                                      <div className="font-bold text-navy-900">
                                        {m.name || m.email || '—'}
                                      </div>
                                      {(m.nid || m.nomineeName) && (
                                        <div className="text-xs font-medium text-slate-500">
                                          {m.nid ? `NID: ${m.nid}` : ''}
                                          {m.nid && m.nomineeName ? ' · ' : ''}
                                          {m.nomineeName ? `${t('nomineeName')}: ${m.nomineeName}` : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="text-slate-700">{m.phone || '—'}</div>
                                  <div className="text-xs text-slate-500">{m.email}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                      regStatus === 'approved'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : regStatus === 'pending'
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : regStatus === 'rejected'
                                        ? 'bg-red-50 text-red-700 border border-red-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {regStatus === 'approved'
                                      ? t('regStatusApproved')
                                      : regStatus === 'pending'
                                      ? t('regStatusPending')
                                      : regStatus === 'rejected'
                                      ? t('regStatusRejected')
                                      : t('regStatusUnsubmitted')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-navy-900 tabular-nums">
                                  {formatCurrency(m.totalSavings)}
                                </td>
                                <td className="py-3 px-4">
                                  <StatusText status={m.status} />
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-2">
                                    {m.status === 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() => handleApproveMemberAccount(m)}
                                        className="min-h-[36px] px-3 py-1 rounded-lg bg-[#168A3D] hover:bg-[#117031] text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                                      >
                                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                          {lang === 'bn' ? 'আইডি অনুমোদন করুন' : 'Approve ID'}
                                        </span>
                                      </button>
                                    )}
                                    {m.status === 'active' && regStatus !== 'approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRegistrationDecision(m, 'approved')}
                                        className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                                      >
                                        {t('approveRegistrationBtn')}
                                      </button>
                                    )}
                                    {m.status === 'active' && regStatus === 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() => handleRegistrationDecision(m, 'rejected')}
                                        className="min-h-[36px] px-3 py-1 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 text-xs font-semibold cursor-pointer whitespace-nowrap"
                                      >
                                        {t('rejectRegistrationBtn')}
                                      </button>
                                    )}
                                    {m.status !== 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleMemberStatus(m)}
                                        className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 hover:border-navy-700 text-xs font-semibold text-navy-900 cursor-pointer whitespace-nowrap"
                                      >
                                        {m.status === 'active' ? t('suspendBtn') : t('activateBtn')}
                                      </button>
                                    )}
                                  </div>
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
          )}

          {tab === 'payments' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-900">{t('paymentVerificationTitle')}</h2>
                <p className="text-sm text-slate-600 mt-0.5">{t('paymentVerificationSub')}</p>
              </div>

              <div className="flex flex-wrap sm:inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                {(['pending', 'approved', 'rejected', 'all'] as const).map((statusTab) => (
                  <button
                    key={statusTab}
                    type="button"
                    onClick={() => setPaymentFilter(statusTab)}
                    className={`flex-1 sm:flex-initial min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      paymentFilter === statusTab
                        ? 'bg-[#168A3D] text-white'
                        : 'text-slate-600 hover:text-navy-900'
                    }`}
                  >
                    {t(statusTab)}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                {filteredPayments.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">{t('noRecords')}</div>
                ) : (
                  <>
                    {/* Mobile Touch Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {filteredPayments.map((p) => (
                        <div key={p.id} className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-base font-bold text-navy-900 truncate">
                                {p.memberName}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                {p.memberId} · {formatDate(p.createdAt)}
                              </div>
                            </div>
                            <StatusText status={p.status} />
                          </div>

                          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-navy-900">
                                {t(p.method)} · {t(p.paymentType)}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {t('month')}: {p.month}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-navy-900 tabular-nums shrink-0">
                              {formatCurrency(p.amount)}
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1">
                            <div>
                              <span className="text-slate-500">{t('trxIdLabel')}: </span>
                              <span className="font-mono font-bold text-navy-900">
                                {p.transactionId}
                              </span>
                            </div>
                            {p.senderAccount && (
                              <div>
                                <span className="text-slate-500">{t('senderAccountLabel')}: </span>
                                <span className="font-mono">{p.senderAccount}</span>
                              </div>
                            )}
                            {p.receiptNumber && (
                              <div className="font-mono text-[11px] text-emerald-700 font-semibold">
                                {t('receiptNoLabel')}: {p.receiptNumber}
                              </div>
                            )}
                          </div>

                          {p.screenshotDataUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewImg(p.screenshotDataUrl!)}
                              className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                              <span>{t('viewScreenshot')}</span>
                            </button>
                          )}

                          {p.status === 'pending' ? (
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleVerifyPayment(p, 'approve')}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white text-xs font-bold cursor-pointer"
                              >
                                <Check className="w-4 h-4" />
                                <span>{t('approveAndCredit')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTarget(p)}
                                className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border border-red-300 bg-red-50/50 hover:bg-red-50 active:scale-[0.98] text-red-700 text-xs font-bold cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                <span>{t('rejectBtn')}</span>
                              </button>
                            </div>
                          ) : (
                            p.verifiedBy && (
                              <div className="text-[11px] text-slate-400">{p.verifiedBy}</div>
                            )
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
                            <th className="py-3 px-4">{t('memberIdCol')}</th>
                            <th className="py-3 px-4">{t('method')}</th>
                            <th className="py-3 px-4">{t('trxIdLabel')}</th>
                            <th className="py-3 px-4">{t('month')}</th>
                            <th className="py-3 px-4 text-right">{t('amount')}</th>
                            <th className="py-3 px-4">{t('status')}</th>
                            <th className="py-3 px-4 text-right">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {filteredPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap tabular-nums">
                                {formatDate(p.createdAt)}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-semibold text-navy-900">{p.memberName}</div>
                                <div className="font-mono text-xs text-slate-500">{p.memberId}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-navy-900">{t(p.method)}</div>
                                <div className="text-xs text-slate-500">{t(p.paymentType)}</div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-mono text-xs font-semibold text-navy-900">
                                  {p.transactionId}
                                </div>
                                <div className="text-xs text-slate-500">{p.senderAccount}</div>
                                {p.screenshotDataUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImg(p.screenshotDataUrl!)}
                                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{t('viewScreenshot')}</span>
                                  </button>
                                )}
                              </td>
                              <td className="py-3 px-4 text-slate-700 whitespace-nowrap">{p.month}</td>
                              <td className="py-3 px-4 text-right font-bold text-navy-900 tabular-nums whitespace-nowrap">
                                {formatCurrency(p.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <StatusText status={p.status} />
                                {p.receiptNumber && (
                                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                                    {p.receiptNumber}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {p.status === 'pending' ? (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyPayment(p, 'approve')}
                                      className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>{t('approveAndCredit')}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRejectTarget(p)}
                                      className="inline-flex items-center gap-1 min-h-[36px] px-3 py-1 rounded-lg border border-red-300 hover:bg-red-50 text-red-700 text-xs font-semibold cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>{t('rejectBtn')}</span>
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    {p.verifiedBy || '—'}
                                  </span>
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

          {tab === 'society' && (
            <OurSocietyView
              members={data.members}
              payments={data.payments}
              fines={data.fines}
              settings={data.settings}
            />
          )}

          {tab === 'fines' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{t('fineManagementTitle')}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{t('fineManagementSub')}</p>
                </div>
                <button
                  type="button"
                  disabled={data.members.length === 0}
                  onClick={() => setShowAddFine(true)}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#09328E] hover:bg-navy-800 disabled:opacity-50 text-white text-sm font-semibold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('imposeFineBtn')}</span>
                </button>
              </div>

              <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                {data.fines.length === 0 ? (
                  <div className="p-10 text-center text-sm text-slate-500">{t('noRecords')}</div>
                ) : (
                  <>
                    {/* Mobile Touch Cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {data.fines.map((fine) => (
                        <div key={fine.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-base font-bold text-navy-900">
                                {fine.memberName}
                              </div>
                              <div className="font-mono text-xs text-slate-500">
                                {fine.memberId}
                              </div>
                            </div>
                            <StatusText status={fine.status} />
                          </div>
                          <div className="text-sm text-slate-700">{fine.reason}</div>
                          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                            <span className="tabular-nums">
                              {t('dueDate')}: {formatDate(fine.dueDate)}
                            </span>
                            <span className="text-base font-bold text-navy-900 tabular-nums">
                              {formatCurrency(fine.amount)}
                            </span>
                          </div>
                          {fine.status === 'unpaid' && (
                            <div className="grid grid-cols-2 gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleFineAction(fine.id, 'paid')}
                                className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold cursor-pointer"
                              >
                                {t('markPaid')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleFineAction(fine.id, 'waived')}
                                className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-300 active:scale-[0.98] text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                {t('waiveFine')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                            <th className="py-3 px-4">{t('memberIdCol')}</th>
                            <th className="py-3 px-4">{t('fineReason')}</th>
                            <th className="py-3 px-4">{t('dueDate')}</th>
                            <th className="py-3 px-4 text-right">{t('amount')}</th>
                            <th className="py-3 px-4">{t('status')}</th>
                            <th className="py-3 px-4 text-right">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {data.fines.map((fine) => (
                            <tr key={fine.id} className="hover:bg-slate-50/70">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-navy-900">{fine.memberName}</div>
                                <div className="font-mono text-xs text-slate-500">
                                  {fine.memberId}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-700">{fine.reason}</td>
                              <td className="py-3 px-4 text-slate-600 tabular-nums whitespace-nowrap">
                                {formatDate(fine.dueDate)}
                              </td>
                              <td className="py-3 px-4 text-right font-bold text-navy-900 tabular-nums">
                                {formatCurrency(fine.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <StatusText status={fine.status} />
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                {fine.status === 'unpaid' && (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleFineAction(fine.id, 'paid')}
                                      className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                                    >
                                      {t('markPaid')}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleFineAction(fine.id, 'waived')}
                                      className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
                                    >
                                      {t('waiveFine')}
                                    </button>
                                  </div>
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

          {tab === 'ledger' && (
            <AdminLedgerView data={data} onReload={loadData} onToast={showToast} />
          )}

          {tab === 'investments' && (
            <AdminInvestmentsView data={data} onReload={loadData} onToast={showToast} />
          )}

          {tab === 'governance' && (
            <AdminGovernanceView data={data} onReload={loadData} onToast={showToast} />
          )}

          {tab === 'reports' && <AdminReportsView data={data} />}

          {tab === 'notices' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">{t('navNotices')}</h2>
                  <p className="text-sm text-slate-600 mt-0.5">{t('meetingsTab')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(true)}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#168A3D] hover:bg-emerald-800 text-white text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{t('scheduleMeetingBtn')}</span>
                </button>
              </div>

              {data.meetings.length === 0 ? (
                <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center text-sm text-slate-500">
                  {t('noRecords')}
                </div>
              ) : (
                <div className="space-y-3">
                  {data.meetings.map((m) => (
                    <div key={m.id} className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                            <span>{formatDate(m.date)}</span>
                            <span>·</span>
                            <span>{m.time}</span>
                            <span>·</span>
                            <span>{m.location}</span>
                          </div>
                          <h3 className="text-base font-bold text-navy-900 mt-1">
                            {lang === 'bn' ? m.titleBn : m.titleEn}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusText status={m.status} />
                          {m.status === 'upcoming' && (
                            <button
                              type="button"
                              onClick={() => handleCompleteNotice(m.id)}
                              className="min-h-[36px] px-3 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-navy-900 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                            >
                              {t('markCompleted')}
                            </button>
                          )}
                        </div>
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

          {tab === 'rules' && (
            <div className="space-y-5">
              <SocietyRulesView />
              <SocietyRulesFooter />
            </div>
          )}

          {tab === 'settings' && (
            <AdminSettingsView
              data={data}
              onReload={loadData}
              onToast={showToast}
              onLogout={handleSignOut}
            />
          )}
        </main>
      </div>

      {/* Screenshot Preview Modal */}
      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <div
            className="max-w-lg w-full rounded-2xl bg-white p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">{t('viewScreenshot')}</h3>
              <button
                type="button"
                onClick={() => setPreviewImg(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewImg}
              alt="Payment Screenshot"
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200"
            />
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('addMemberBtn')}</h3>
            <form onSubmit={handleAddMember} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('fullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('emailLabel')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={mEmail}
                    onChange={(e) => setMEmail(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('phoneNumber')} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={mPhone}
                    onChange={(e) => setMPhone(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('nidLabel')}
                  </label>
                  <input
                    type="text"
                    value={mNid}
                    onChange={(e) => setMNid(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('monthlyTargetCol')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={mTarget}
                    onChange={(e) => setMTarget(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('addressLabel')}
                </label>
                <input
                  type="text"
                  value={mAddress}
                  onChange={(e) => setMAddress(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('createPassword')} *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={mPassword}
                  onChange={(e) => setMPassword(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#09328E] text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Payment Modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-2">{t('rejectBtn')}</h3>
            <p className="text-xs text-slate-500 mb-4">
              {rejectTarget.memberName} ({rejectTarget.memberId}) · {rejectTarget.transactionId}
            </p>
            <input
              type="text"
              placeholder={t('rejectionReasonPrompt')}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleVerifyPayment(rejectTarget, 'reject', rejectReason)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-red-700 text-white text-sm font-semibold cursor-pointer"
              >
                {t('confirmReject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Impose Fine Modal */}
      {showAddFine && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('imposeFineBtn')}</h3>
            <form onSubmit={handleCreateFine} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('selectMember')}
                </label>
                <select
                  value={fineMemberId}
                  onChange={(e) => setFineMemberId(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm bg-white"
                >
                  {data.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.memberId} · {m.name || m.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('fineReason')} *
                </label>
                <input
                  type="text"
                  required
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('amountBdtLabel')} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('dueDate')}
                  </label>
                  <input
                    type="date"
                    value={fineDueDate}
                    onChange={(e) => setFineDueDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-base sm:text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddFine(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#09328E] text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Notice Modal */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 shadow-xl">
            <h3 className="text-lg font-bold text-navy-900 mb-4">{t('scheduleMeetingBtn')}</h3>
            <form onSubmit={handleCreateNotice} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('meetingTitleBn')} *
                </label>
                <input
                  type="text"
                  required
                  value={nTitleBn}
                  onChange={(e) => setNTitleBn(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('meetingTitleEn')}
                </label>
                <input
                  type="text"
                  value={nTitleEn}
                  onChange={(e) => setNTitleEn(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('date')}
                  </label>
                  <input
                    type="date"
                    value={nDate}
                    onChange={(e) => setNDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('meetingTime')}
                  </label>
                  <input
                    type="time"
                    value={nTime}
                    onChange={(e) => setNTime(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('meetingLocation')}
                </label>
                <input
                  type="text"
                  value={nLocation}
                  onChange={(e) => setNLocation(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('agendaBn')}
                </label>
                <textarea
                  rows={2}
                  value={nAgendaBn}
                  onChange={(e) => setNAgendaBn(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-medium cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#168A3D] text-white text-sm font-semibold cursor-pointer"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
