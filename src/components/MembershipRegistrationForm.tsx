import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  User,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiRequest, getMemberToken } from '../lib/api.ts';
import { processAnyImageToDataUrl } from '../lib/imageUtils.ts';
import type { MemberPublic, MembershipType } from '../types.ts';
import { SocietyCrest } from './StatusText.tsx';

interface MembershipRegistrationFormProps {
  mode: 'signup' | 'member';
  member?: MemberPublic;
  defaultMonthlyAmount?: number;
  onBackToLogin?: () => void;
  onSignupComplete?: (payload: { token?: string; pendingApproval?: boolean; member: MemberPublic }) => void;
  onMemberSaved?: () => Promise<void> | void;
  onToast?: (msg: string, isError?: boolean) => void;
}

export function MembershipRegistrationForm({
  mode,
  member,
  defaultMonthlyAmount = 5000,
  onBackToLogin,
  onSignupComplete,
  onMemberSaved,
  onToast,
}: MembershipRegistrationFormProps) {
  const { lang, t, formatDate } = useLanguage();

  // Signup-only credentials
  const [email, setEmail] = useState(member?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 12 numbered fields matching Image 1
  const [name, setName] = useState(member?.name || '');
  const [fatherName, setFatherName] = useState(member?.fatherName || '');
  const [motherName, setMotherName] = useState(member?.motherName || '');
  const [dateOfBirth, setDateOfBirth] = useState(member?.dateOfBirth || '');
  const [nid, setNid] = useState(member?.nid || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [occupation, setOccupation] = useState(member?.occupation || '');
  const [address, setAddress] = useState(member?.address || '');
  const [permanentAddress, setPermanentAddress] = useState(member?.permanentAddress || '');
  const [membershipType, setMembershipType] = useState<MembershipType>(
    member?.membershipType || 'general'
  );
  const [monthlyTarget, setMonthlyTarget] = useState(
    String(member?.monthlyTarget || defaultMonthlyAmount || 5000)
  );
  const [nomineeName, setNomineeName] = useState(member?.nomineeName || '');
  const [nomineeRelation, setNomineeRelation] = useState(member?.nomineeRelation || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState(member?.avatarDataUrl || '');
  const [signatureText, setSignatureText] = useState(member?.signatureText || '');
  const [acceptedRules, setAcceptedRules] = useState(
    member?.acceptedRules !== undefined ? member.acceptedRules : true
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!member) return;
    setEmail(member.email || '');
    setName(member.name || '');
    setFatherName(member.fatherName || '');
    setMotherName(member.motherName || '');
    setDateOfBirth(member.dateOfBirth || '');
    setNid(member.nid || '');
    setPhone(member.phone || '');
    setOccupation(member.occupation || '');
    setAddress(member.address || '');
    setPermanentAddress(member.permanentAddress || '');
    setMembershipType(member.membershipType || 'general');
    setMonthlyTarget(String(member.monthlyTarget || defaultMonthlyAmount || 5000));
    setNomineeName(member.nomineeName || '');
    setNomineeRelation(member.nomineeRelation || '');
    setAvatarDataUrl(member.avatarDataUrl || '');
    setSignatureText(member.signatureText || member.name || '');
    setAcceptedRules(member.acceptedRules !== undefined ? member.acceptedRules : true);
  }, [member, defaultMonthlyAmount]);

  const regStatus =
    member?.registrationStatus ||
    (member?.registrationCompleted ? 'approved' : 'unsubmitted');

  const regStatusLabel =
    regStatus === 'approved'
      ? t('regStatusApproved')
      : regStatus === 'pending'
      ? t('regStatusPending')
      : regStatus === 'rejected'
      ? t('regStatusRejected')
      : t('regStatusUnsubmitted');

  const handlePhotoUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const processed = await processAnyImageToDataUrl(file, 720);
      setAvatarDataUrl(processed);
    } catch {
      const msg = lang === 'bn' ? 'ছবিটি লোড করা যায়নি, অন্য ছবি চেষ্টা করুন' : 'Could not load selected image';
      setFormError(msg);
      onToast?.(msg, true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!acceptedRules) {
      const msg =
        lang === 'bn'
          ? 'অনুগ্রহ করে অঙ্গীকারনামা ও নিয়মাবলীতে সম্মতি দিন।'
          : 'Please accept the pledge and society rules.';
      setFormError(msg);
      onToast?.(msg, true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name,
        fatherName,
        motherName,
        dateOfBirth,
        email,
        phone,
        address,
        permanentAddress,
        occupation,
        nid,
        membershipType,
        monthlyTarget: Number(monthlyTarget) || 5000,
        nomineeName,
        nomineeRelation,
        avatarDataUrl,
        signatureText: signatureText || name,
        acceptedRules,
      };

      if (mode === 'signup') {
        const res = await apiRequest<{ token?: string; pendingApproval?: boolean; member: MemberPublic }>(
          '/api/auth/member/register',
          {
            method: 'POST',
            body: JSON.stringify({
              ...payload,
              password,
            }),
          }
        );
        onSignupComplete?.(res);
      } else {
        await apiRequest('/api/member/complete-registration', {
          method: 'POST',
          token: getMemberToken(),
          body: JSON.stringify(payload),
        });
        await onMemberSaved?.();
        onToast?.(t('regSubmittedToast'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setFormError(msg);
      onToast?.(msg, true);
    } finally {
      setSubmitting(false);
    }
  };

  const todayDisplay = formatDate(new Date().toISOString().slice(0, 10));

  return (
    <div className="w-full max-w-4xl mx-auto">
      {mode === 'signup' && onBackToLogin && (
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLogin}
            className="inline-flex items-center gap-2 min-h-[42px] px-4 py-2 rounded-full bg-white border border-[#8DB7FA] hover:border-[#041E5C] text-[#041E5C] text-xs sm:text-sm font-bold shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('backToLoginBtn')}</span>
          </button>
        </div>
      )}

      {mode === 'member' && member && (
        <div
          className={`mb-4 rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
            regStatus === 'approved'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : regStatus === 'pending'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : regStatus === 'rejected'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-blue-50 border-blue-200 text-navy-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {regStatus === 'approved' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <div>
              <div className="text-xs font-semibold opacity-75">{t('status')}</div>
              <div className="text-sm font-bold">{regStatusLabel}</div>
            </div>
          </div>
          <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-white border border-black/10">
            {member.memberId}
          </span>
        </div>
      )}

      {/* Official Registration Paper Card (Matching Image 1) */}
      <form
        onSubmit={handleSubmit}
        className="rounded-[24px] bg-white border-2 border-[#7AA8EB] shadow-[0_14px_38px_-12px_rgba(4,30,92,0.25)] overflow-hidden"
      >
        {/* Top Royal Navy & Emerald Curved Form Header */}
        <div className="relative bg-gradient-to-r from-[#041E5C] via-[#0A3A9E] to-[#0B6D36] text-white px-4 sm:px-8 pt-5 pb-8 text-center overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 relative z-10">
            <div className="rounded-full p-1 bg-gradient-to-br from-[#FFE055] via-[#F5C518] to-[#C88A00] shadow-md shrink-0">
              <SocietyCrest className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-blue-100">
                {t('regBannerTagline')}
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mt-0.5">
                {lang === 'bn' ? 'হ্যালো নোয়াখালী' : 'Hello Noakhali'}
              </h1>
              <div className="text-lg sm:text-2xl font-extrabold text-[#FFD426] leading-tight">
                {lang === 'bn' ? 'সঞ্চয় ও বিনিয়োগ সমিতি' : 'Savings & Investment Society'}
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-3 inline-block rounded-full bg-gradient-to-r from-[#FFE055] via-[#FFD426] to-[#F5C518] text-[#041E5C] px-4 sm:px-7 py-1.5 text-xs sm:text-sm font-extrabold shadow-sm border border-yellow-200">
            {t('regBannerPill')}
          </div>

          <svg
            viewBox="0 0 1440 34"
            preserveAspectRatio="none"
            className="absolute bottom-0 left-0 w-full h-4 sm:h-5 pointer-events-none"
            aria-hidden="true"
          >
            <path d="M0,12 C380,36 1060,-4 1440,18 L1440,34 L0,34 Z" fill="#F5C518" />
            <path d="M0,20 C380,40 1060,2 1440,24 L1440,34 L0,34 Z" fill="#FFFFFF" />
          </svg>
        </div>

        {/* Navy Pill Title: সদস্য নিবন্ধন ফরম (Membership Registration Form) */}
        <div className="px-4 sm:px-8 pt-3 pb-4 flex items-center justify-center gap-3">
          <span className="hidden sm:block flex-1 h-[2px] bg-[#0B3B8E]/40" />
          <div className="rounded-full bg-gradient-to-r from-[#041E5C] to-[#0E49C9] text-white px-6 sm:px-10 py-2 text-center shadow-sm">
            <div className="text-base sm:text-xl font-extrabold leading-tight">
              {t('regFormHeading')}
            </div>
            <div className="text-[11px] sm:text-xs font-medium text-blue-100">
              ({t('regFormSubHeading')})
            </div>
          </div>
          <span className="hidden sm:block flex-1 h-[2px] bg-[#0B3B8E]/40" />
        </div>

        <div className="px-4 sm:px-8 pb-6 space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700">
              {formError}
            </div>
          )}

          {/* Account Credentials Row (only when signing up from Login Page) */}
          {mode === 'signup' && (
            <div className="rounded-2xl bg-[#EEF5FF] border border-[#9CC2FA] p-4 space-y-3">
              <div className="text-xs sm:text-sm font-extrabold text-[#041E5C] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0B3B8E]" />
                <span>{t('accountCredentialsTitle')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#061E54] mb-1">
                    {t('emailOrPhoneLabel')} *
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#0B3B8E] absolute left-3" />
                    <input
                      type="email"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full min-h-[42px] pl-9 pr-3 rounded-lg border border-[#8DB7FA] bg-white text-sm font-semibold text-[#061E54]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#061E54] mb-1">
                    {t('createPassword')} *
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-[#0B3B8E] absolute left-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full min-h-[42px] pl-9 pr-10 rounded-lg border border-[#8DB7FA] bg-white text-sm font-semibold text-[#061E54]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 p-1.5 text-slate-500 hover:text-[#041E5C] cursor-pointer"
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main 2-Column Body: Left 12 Numbered Fields + Right Photo & Pledge */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 12 Numbered Fields */}
            <div className="lg:col-span-8 space-y-3 text-sm sm:text-base">
              {/* 1. সদস্যের নাম */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '১. সদস্যের নাম :' : `1. ${t('fullName')} :`} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 2. পিতার নাম */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '২. পিতার নাম :' : `2. ${t('fatherNameLabel')} :`}
                </label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 3. মাতার নাম */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৩. মাতার নাম :' : `3. ${t('motherNameLabel')} :`}
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 4. জন্ম তারিখ */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৪. জন্ম তারিখ :' : `4. ${t('dobLabel')} :`}
                </label>
                <div className="sm:col-span-8 flex items-center gap-2">
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] tabular-nums focus:border-[#0B3B8E] focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    {lang === 'bn' ? '(ইং)' : '(AD)'}
                  </span>
                </div>
              </div>

              {/* 5. জাতীয় পরিচয়পত্র নং */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৫. জাতীয় পরিচয়পত্র নং :' : `5. ${t('nidLabel')} :`} *
                </label>
                <input
                  type="text"
                  required
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-mono font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 6. মোবাইল নম্বর */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৬. মোবাইল নম্বর :' : `6. ${t('phoneNumber')} :`} *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-mono font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 7. পেশা */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৭. পেশা :' : `7. ${t('occupationLabel')} :`}
                </label>
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 8. বর্তমান ঠিকানা */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৮. বর্তমান ঠিকানা :' : `8. ${t('addressLabel')} :`} *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 9. স্থায়ী ঠিকানা */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '৯. স্থায়ী ঠিকানা :' : `9. ${t('permanentAddressLabel')} :`}
                </label>
                <input
                  type="text"
                  value={permanentAddress}
                  onChange={(e) => setPermanentAddress(e.target.value)}
                  className="sm:col-span-8 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                />
              </div>

              {/* 10. সদস্যপদের ধরন checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2 pt-0.5">
                <span className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '১০. সদস্যপদের ধরন :' : `10. ${t('membershipTypeLabel')} :`}
                </span>
                <div className="sm:col-span-8 flex flex-wrap items-center gap-4">
                  {(
                    [
                      { id: 'general', label: t('memberGeneral') },
                      { id: 'honorable', label: t('memberHonorable') },
                      { id: 'other', label: t('memberOther') },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[34px]"
                    >
                      <input
                        type="radio"
                        name="membershipType"
                        checked={membershipType === opt.id}
                        onChange={() => setMembershipType(opt.id)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded-xs border-2 flex items-center justify-center transition-colors ${
                          membershipType === opt.id
                            ? 'border-[#041E5C] bg-[#041E5C] text-white'
                            : 'border-slate-500 bg-white'
                        }`}
                      >
                        {membershipType === opt.id && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[#061E54]">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 11. মাসিক সঞ্চয়ের পরিমাণ */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '১১. মাসিক সঞ্চয়ের পরিমাণ :' : `11. ${t('monthlySavingsAmountLabel')} :`}
                </label>
                <div className="sm:col-span-8 flex items-center gap-2">
                  <input
                    type="number"
                    min={500}
                    step={100}
                    value={monthlyTarget}
                    onChange={(e) => setMonthlyTarget(e.target.value)}
                    className="w-40 min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-bold tabular-nums text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                  />
                  <span className="text-sm font-bold text-[#061E54]">
                    {lang === 'bn' ? 'টাকা' : 'BDT'}
                  </span>
                </div>
              </div>

              {/* 12. মনোনীত নমিনি (নাম ও সম্পর্ক) */}
              <div className="grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-1 sm:gap-2">
                <label className="sm:col-span-4 font-bold text-[#061E54]">
                  {lang === 'bn' ? '১২. মনোনীত নমিনি :' : `12. ${t('nomineeBothLabel')} :`} *
                </label>
                <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder={t('nomineeName')}
                    className="min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={nomineeRelation}
                    onChange={(e) => setNomineeRelation(e.target.value)}
                    placeholder={t('nomineeRelation')}
                    className="min-h-[38px] px-3 py-1.5 rounded-md border border-slate-500 bg-white text-sm font-semibold text-[#061E54] focus:border-[#0B3B8E] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Passport Size Photo Upload + অঙ্গীকারনামা Pledge Box */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {/* Passport Photo Frame */}
              <div className="flex flex-col items-center gap-2">
                <label className="mx-auto w-44 h-52 rounded-lg border-2 border-[#041E5C] bg-[#F8FBFF] hover:bg-blue-50/60 flex flex-col items-center justify-center p-2 cursor-pointer overflow-hidden relative transition-colors shadow-xs">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoUpload(e.target.files?.[0])}
                    className="sr-only"
                  />
                  {avatarDataUrl ? (
                    <img
                      src={avatarDataUrl}
                      alt={name || 'Passport size photo'}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center text-[#041E5C]">
                      <div className="w-20 h-20 rounded-full bg-[#041E5C]/10 flex items-center justify-center mb-2">
                        <User className="w-12 h-12 text-[#041E5C]/70" />
                      </div>
                      <Camera className="w-5 h-5 text-[#0B3B8E] mb-1" />
                      <span className="text-sm font-extrabold leading-tight">
                        {t('passportPhotoLabel')}
                      </span>
                    </div>
                  )}
                </label>
                <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#09328E] hover:bg-[#041E5C] text-white text-xs sm:text-sm font-bold cursor-pointer shadow-xs">
                  <Camera className="w-4 h-4 text-[#FFD426]" />
                  <span>{lang === 'bn' ? 'যেকোনো ছবি আপলোড করুন' : 'Upload Any Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoUpload(e.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* Light-Blue Pledge / অঙ্গীকারনামা Box */}
              <div className="rounded-xl bg-[#DDF0FF] border border-[#6EA8E5] p-4 text-[#041E5C] space-y-2.5">
                <div className="text-sm font-extrabold text-center uppercase tracking-wide border-b border-[#6EA8E5]/50 pb-1">
                  {t('pledgeTitle')}
                </div>
                <p className="text-sm font-bold leading-relaxed text-center">
                  {t('pledgeText')}
                </p>
                <label className="flex items-start gap-2 cursor-pointer pt-1 text-xs sm:text-sm font-extrabold">
                  <input
                    type="checkbox"
                    checked={acceptedRules}
                    onChange={(e) => setAcceptedRules(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#168A3D] rounded shrink-0"
                  />
                  <span>{t('pledgeAcceptLabel')}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Bottom 3-Column Section: Rules + Member Signature + Officer Signature */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
            {/* সদস্যদের নিয়মাবলী Box */}
            <div className="md:col-span-6 rounded-xl border border-[#0B3B8E] overflow-hidden bg-white">
              <div className="bg-gradient-to-r from-[#041E5C] to-[#0E49C9] text-white px-3.5 py-2 flex items-center gap-2 text-sm sm:text-base font-extrabold">
                <FileText className="w-4 h-4 text-[#FFD426] shrink-0" />
                <span>{t('rulesBoxTitle')}</span>
              </div>
              <ul className="p-3.5 space-y-1.5 text-xs sm:text-sm font-bold text-[#061E54] leading-snug">
                <li>{t('regRule1')}</li>
                <li>{t('regRule2')}</li>
                <li>{t('regRule3')}</li>
                <li>{t('regRule4')}</li>
                <li>{t('regRule5')}</li>
              </ul>
            </div>

            {/* সদস্যের স্বাক্ষর */}
            <div className="md:col-span-3 rounded-xl border border-[#0B3B8E] bg-[#F6FAFF] p-3 flex flex-col justify-between gap-2">
              <div className="text-xs sm:text-sm font-extrabold text-[#041E5C] text-center">
                {t('memberSignatureLabel')}
              </div>
              <input
                type="text"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                placeholder={name || t('memberSignatureLabel')}
                className="w-full h-14 px-2 rounded-lg border border-slate-400 bg-white text-center font-semibold italic text-sm text-[#041E5C] focus:border-[#0B3B8E] focus:outline-none"
              />
              <div className="text-[11px] font-bold text-[#061E54] text-center tabular-nums">
                {t('date')} : {todayDisplay}
              </div>
            </div>

            {/* গ্রহণকারী কর্মকর্তার স্বাক্ষর */}
            <div className="md:col-span-3 rounded-xl border border-[#0B3B8E] bg-[#F6FAFF] p-3 flex flex-col justify-between gap-2">
              <div className="text-xs sm:text-sm font-extrabold text-[#041E5C] text-center">
                {t('officerSignatureLabel')}
              </div>
              <div className="h-14 rounded-lg border border-slate-400 bg-white flex items-center justify-center px-2 text-center">
                {regStatus === 'approved' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{t('approved')}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {t('awaitingApprovalStamp')}
                  </span>
                )}
              </div>
              <div className="text-[11px] font-bold text-[#061E54] text-center tabular-nums">
                {t('date')} : {regStatus === 'approved' ? todayDisplay : '____ / ____ / ______'}
              </div>
            </div>
          </div>

          {/* Submit CTA Row */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-1">
            {mode === 'signup' && onBackToLogin && (
              <button
                type="button"
                onClick={onBackToLogin}
                className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-full border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 cursor-pointer"
              >
                {t('cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-full bg-gradient-to-r from-[#0D7A32] to-[#169C43] hover:brightness-105 active:scale-[0.98] disabled:opacity-60 text-white font-extrabold text-sm sm:text-base shadow-md cursor-pointer"
            >
              {submitting
                ? t('signingIn')
                : mode === 'signup'
                ? t('newMemberRegisterBtn')
                : t('regSubmitBtn')}
            </button>
          </div>
        </div>

        {/* Bottom Navy + Gold Curved Footer (Matching Image 1) */}
        <div className="bg-gradient-to-r from-[#041E5C] via-[#09328E] to-[#041E5C] border-t-4 border-[#F5C518] text-white px-4 py-3 text-center">
          <p className="text-xs sm:text-sm font-bold text-[#FFD426] tracking-wide">
            {t('regFooterLine')}
          </p>
        </div>
      </form>
    </div>
  );
}
