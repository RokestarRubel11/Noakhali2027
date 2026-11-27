import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Handshake,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { LanguageToggle } from './LanguageToggle.tsx';
import { SocietyCrest } from './StatusText.tsx';

interface PortalAuthLayoutProps {
  role: 'unified' | 'member' | 'admin';
  authMode?: 'login' | 'create';
  onBack?: () => void;
  onRegisterClick?: () => void;
  onBackToLogin?: () => void;
  customContent?: React.ReactNode;
  identifier: string;
  onIdentifierChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  rememberMe: boolean;
  onRememberMeChange: (val: boolean) => void;
  error: string;
  notice?: string;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  identifierPlaceholder: string;
  identifierLabel: string;
  passwordMinLength?: number;
}

export function PortalAuthLayout({
  role,
  authMode = 'login',
  onBack,
  onRegisterClick,
  onBackToLogin,
  customContent,
  identifier,
  onIdentifierChange,
  password,
  onPasswordChange,
  rememberMe,
  onRememberMeChange,
  error,
  notice,
  loading,
  onSubmit,
  identifierPlaceholder,
  identifierLabel,
  passwordMinLength,
}: PortalAuthLayoutProps) {
  const { lang, t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const isCreateMode = authMode === 'create';
  const pillTitle = isCreateMode
    ? t('createIdHeader')
    : role === 'admin'
    ? t('adminLoginPillTitle')
    : role === 'unified'
    ? lang === 'bn'
      ? 'সদস্য ও অ্যাডমিন লগইন'
      : 'Member & Admin Login'
    : t('memberLoginHeader');

  const features = [
    { icon: ShieldCheck, label: t('featureSafeSavings') },
    { icon: TrendingUp, label: t('featureProfitableInv') },
    { icon: Users, label: t('featureMemberWelfare') },
    { icon: Handshake, label: t('featureTogetherAll') },
  ];

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-gradient-to-b from-[#BCE2FF] via-[#DCEEFF] to-[#D4F0DE] text-[#061E54] relative overflow-x-hidden">
      {/* Top Scenic Curved Header matching Image 3 */}
      <header className="relative w-full pt-3 sm:pt-4 pb-6 sm:pb-7 px-3.5 sm:px-8 overflow-hidden bg-gradient-to-b from-[#D2EBFF] via-[#EBF6FF] to-white/90">
        {/* Subtle decorative emerald & navy top corner waves */}
        <svg
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute top-0 left-0 w-full h-16 sm:h-24 pointer-events-none opacity-95"
          aria-hidden="true"
        >
          <path d="M0,0 L460,0 C310,60 150,82 0,105 Z" fill="#0B3B8E" />
          <path d="M0,0 L390,0 C260,55 125,75 0,92 Z" fill="#168A3D" opacity="0.85" />
          <path d="M1440,0 L1080,0 C1210,45 1330,68 1440,90 Z" fill="#168A3D" opacity="0.22" />
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-white/90 hover:bg-white border border-[#8DB7FA] text-xs sm:text-sm font-bold text-[#041E5C] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t('backToGateway')}</span>
              </button>
            ) : (
              <div className="w-24" />
            )}
            <LanguageToggle variant="light" />
          </div>

          {/* Centered Emblem + Society Name + Slogan */}
          <div className="flex flex-col items-center text-center">
            <div className="rounded-full p-1.5 bg-gradient-to-br from-[#FFE055] via-[#F5C518] to-[#C88A00] shadow-[0_6px_22px_rgba(4,30,92,0.22)]">
              <SocietyCrest className="w-20 h-20 sm:w-24 sm:h-24 rounded-full" />
            </div>

            <h1 className="mt-2.5 text-3xl sm:text-5xl font-extrabold tracking-tight text-[#041E5C] leading-none">
              {lang === 'bn' ? t('societyNameTop') : 'Hello Noakhali'}
            </h1>
            <div className="mt-1 text-xl sm:text-3xl font-extrabold text-[#0D7A32] leading-tight">
              {lang === 'bn' ? t('societyNameSub') : 'Savings & Investment Society'}
            </div>

            <div className="mt-2 flex items-center justify-center gap-3 w-full max-w-md">
              <span className="flex-1 h-[1.5px] bg-[#0B3B8E]/45 rounded-full" />
              <p className="text-sm sm:text-lg font-extrabold text-[#041E5C] whitespace-nowrap">
                {lang === 'bn' ? '“সঞ্চয়ে শক্তি, ঐক্যে উন্নতি”' : t('societyMotto')}
              </p>
              <span className="flex-1 h-[1.5px] bg-[#0B3B8E]/45 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 pt-3 pb-7 flex flex-col justify-center">
        {customContent ? (
          customContent
        ) : (
          <div className="w-full rounded-[28px] overflow-hidden shadow-[0_18px_46px_-12px_rgba(4,30,92,0.32)] border-2 border-[#7FAEF8] grid grid-cols-1 lg:grid-cols-12 bg-gradient-to-br from-[#062C7A] via-[#0B45A8] to-[#117A42]">
            {/* Left Split Panel (Matching Image 3 Navy/Emerald Feature Column) */}
            <div className="lg:col-span-5 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug text-white drop-shadow-xs text-center lg:text-left">
                  {t('loginHeroTitle')}
                </h2>
                <div className="mx-auto lg:mx-0 mt-1.5 w-44 h-1 rounded-full bg-gradient-to-r from-[#FFD426] via-[#F5C518] to-transparent" />

                <ul className="mt-6 space-y-4 max-w-xs mx-auto lg:mx-0">
                  {features.map((feat, idx) => {
                    const Icon = feat.icon;
                    return (
                      <li key={idx} className="flex items-center gap-3.5">
                        <span className="w-10 h-10 rounded-full bg-white text-[#0D7A32] flex items-center justify-center shadow-sm shrink-0">
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </span>
                        <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                          {feat.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Subtle Gold Coins & Sprouting Growth Illustration at Bottom */}
              <div className="relative z-10 mt-6 pt-2 flex items-end justify-center lg:justify-start" aria-hidden="true">
                <svg viewBox="0 0 260 88" className="w-56 h-20 drop-shadow-md">
                  {/* Coin Stacks */}
                  {[
                    { x: 24, count: 3 },
                    { x: 70, count: 4 },
                    { x: 116, count: 6 },
                    { x: 162, count: 5 },
                    { x: 208, count: 2 },
                  ].map((stack, si) => (
                    <g key={si}>
                      {Array.from({ length: stack.count }).map((_, ci) => {
                        const y = 74 - ci * 9;
                        return (
                          <g key={ci}>
                            <ellipse cx={stack.x} cy={y} rx="20" ry="6" fill="#C98A00" />
                            <ellipse cx={stack.x} cy={y - 2} rx="20" ry="6" fill="#FFD426" stroke="#FCE588" strokeWidth="0.7" />
                          </g>
                        );
                      })}
                    </g>
                  ))}
                  {/* Sprout Stem */}
                  <path d="M116,24 C116,12 114,6 102,4 C112,4 116,10 116,24 Z" fill="#4ADE80" />
                  <path d="M116,24 C116,10 124,2 136,2 C128,12 122,18 116,24 Z" fill="#22C55E" />
                </svg>
              </div>
            </div>

            {/* Right Split White Login Card */}
            <div className="lg:col-span-7 p-4 sm:p-6 flex items-center justify-center">
              <div className="w-full rounded-[24px] bg-white border border-blue-100 shadow-xl px-5 sm:px-8 pt-7 pb-6 relative">
                {/* Top Royal-Blue / Emerald Pill Header */}
                <div className="-mt-11 mb-6 flex justify-center">
                  <div
                    className={`inline-flex items-center gap-2.5 px-7 sm:px-10 py-2.5 rounded-full text-white border-[3px] border-white shadow-md whitespace-nowrap ${
                      isCreateMode
                        ? 'bg-gradient-to-r from-[#0D7A32] via-[#138D3D] to-[#169C43]'
                        : 'bg-gradient-to-r from-[#041E5C] via-[#0B3B8E] to-[#0E49C9]'
                    }`}
                  >
                    {isCreateMode ? (
                      <UserPlus className="w-5 h-5 text-[#FFD426] shrink-0" aria-hidden="true" />
                    ) : role === 'admin' ? (
                      <ShieldCheck className="w-5 h-5 text-[#FFD426] shrink-0" aria-hidden="true" />
                    ) : (
                      <Users className="w-5 h-5 text-white shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-lg sm:text-xl font-extrabold tracking-tight">
                      {pillTitle}
                    </span>
                  </div>
                </div>

                {notice && (
                  <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 stroke-[3]" aria-hidden="true" />
                    <span>{notice}</span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs sm:text-sm font-semibold text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={onSubmit} noValidate className="space-y-4">
                  {/* Identifier / Gmail Input */}
                  <div className="rounded-xl bg-[#FAFCFF] border border-[#B5CFF8] focus-within:border-[#0B3899] focus-within:ring-2 focus-within:ring-[#0B3899]/15 px-3.5 py-2 flex items-center gap-3 transition-all">
                    <div className="w-9 h-9 rounded-full bg-[#09328E] text-white flex items-center justify-center shrink-0">
                      {role === 'admin' || isCreateMode ? (
                        <Mail className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <User className="w-4 h-4" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-600 leading-tight">
                        {identifierLabel}
                      </label>
                      <input
                        type={isCreateMode ? 'email' : 'text'}
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete={isCreateMode ? 'email' : 'username'}
                        required
                        value={identifier}
                        onChange={(e) => onIdentifierChange(e.target.value)}
                        placeholder={identifierPlaceholder}
                        className="w-full bg-transparent text-base sm:text-lg font-bold text-[#061E54] placeholder:text-slate-400 focus:outline-none py-0.5"
                      />
                    </div>
                  </div>

                  {/* Password Input with Eye Toggle */}
                  <div className="rounded-xl bg-[#FAFCFF] border border-[#B5CFF8] focus-within:border-[#0B3899] focus-within:ring-2 focus-within:ring-[#0B3899]/15 px-3.5 py-2.5 flex items-center gap-3 transition-all">
                    <div className="w-10 h-10 rounded-full bg-[#09328E] text-white flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-extrabold text-slate-600 leading-tight">
                        {t('passwordLabel')}
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete={isCreateMode ? 'new-password' : 'current-password'}
                        required
                        minLength={isCreateMode ? passwordMinLength : undefined}
                        value={password}
                        onChange={(e) => onPasswordChange(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent text-base sm:text-lg font-bold text-[#061E54] placeholder:text-slate-400 focus:outline-none py-0.5"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="min-h-[38px] min-w-[38px] rounded-full hover:bg-blue-50 text-slate-500 hover:text-[#0B3899] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    >
                      {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Primary Action Button (Log In or Create ID) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full min-h-[50px] px-6 py-3 rounded-xl hover:brightness-105 active:scale-[0.99] disabled:opacity-60 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                      isCreateMode
                        ? 'bg-gradient-to-r from-[#0D7A32] via-[#138D3D] to-[#169C43] shadow-[0_6px_18px_-4px_rgba(22,138,61,0.45)]'
                        : 'bg-gradient-to-r from-[#04287A] via-[#0B46BA] to-[#0E56DC] shadow-[0_6px_18px_-4px_rgba(11,70,186,0.5)]'
                    }`}
                  >
                    {isCreateMode ? (
                      <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                    ) : (
                      <LogIn className="w-5 h-5 shrink-0" aria-hidden="true" />
                    )}
                    <span>
                      {isCreateMode
                        ? loading
                          ? t('creatingId')
                          : t('createIdHeader')
                        : loading
                        ? t('signingIn')
                        : t('signInBtn')}
                    </span>
                  </button>

                  {/* Remember Me + Forgot Password Row */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[34px]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => onRememberMeChange(e.target.checked)}
                        className="sr-only"
                      />
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          rememberMe
                            ? 'border-[#0B3B8E] bg-[#0B3B8E] text-white'
                            : 'border-slate-400 bg-white'
                        }`}
                      >
                        {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {t('rememberMe')}
                      </span>
                    </label>

                    {!isCreateMode && (
                      <button
                        type="button"
                        onClick={() => setShowForgotHelp((prev) => !prev)}
                        className="inline-flex items-center gap-1 min-h-[34px] text-xs font-bold text-[#0B3B8E] hover:underline cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{t('forgotPassword')}</span>
                      </button>
                    )}
                  </div>

                  {!isCreateMode && showForgotHelp && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
                      {role === 'admin'
                        ? t('forgotPasswordHelpAdmin')
                        : t('forgotPasswordHelpMember')}
                    </div>
                  )}

                  {/* Divider + Create ID Button (Login Mode) OR Back to Login (Create Mode) */}
                  {!isCreateMode && onRegisterClick && (
                    <>
                      <div className="flex items-center gap-3 py-1">
                        <span className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs font-bold text-slate-500">
                          {t('orDivider')}
                        </span>
                        <span className="flex-1 h-px bg-slate-200" />
                      </div>

                      <button
                        type="button"
                        onClick={onRegisterClick}
                        className="w-full min-h-[50px] px-5 py-3 rounded-xl bg-gradient-to-r from-[#0D7A32] via-[#138D3D] to-[#169C43] hover:brightness-105 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg shadow-[0_6px_18px_-4px_rgba(22,138,61,0.45)] flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-5 h-5 shrink-0" aria-hidden="true" />
                        <span>{t('newMemberRegisterBtn')}</span>
                      </button>

                      {role === 'unified' && (
                        <p className="text-center text-xs font-bold text-slate-500 pt-1">
                          {lang === 'bn'
                            ? 'নতুন সদস্যরা আগে Create ID করুন (অ্যাডমিন অনুমোদনের পর লগইন হবে)'
                            : 'New members: use Create ID first (login unlocks after Admin approval)'}
                        </p>
                      )}
                    </>
                  )}

                  {isCreateMode && onBackToLogin && (
                    <button
                      type="button"
                      onClick={onBackToLogin}
                      className="w-full min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 hover:border-[#09328E] bg-slate-50 hover:bg-blue-50/60 text-[#041E5C] font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      <span>{t('backToLoginLabel')}</span>
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Dark Navy Footer matching Image 3 */}
      <footer className="relative z-10 w-full bg-[#041E5C] text-white py-3.5 px-4 text-center border-t border-[#1443A6]">
        <p className="text-xs sm:text-sm font-medium text-blue-50">{t('copyrightLine')}</p>
        <p className="text-xs font-bold text-[#FFD426] mt-0.5 tracking-wide">
          {t('mottoTriplet')}
        </p>
      </footer>
    </div>
  );
}
