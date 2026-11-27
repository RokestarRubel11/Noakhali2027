import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiRequest, setAdminToken, setMemberToken } from '../lib/api.ts';
import type { AdminUserPublic, MemberPublic } from '../types.ts';
import { PortalAuthLayout } from './PortalAuthLayout.tsx';

interface UnifiedAuthScreenProps {
  onSuccess: (role: 'admin' | 'member') => void;
}

const REMEMBER_IDENTIFIER_KEY = 'hn_remember_login_id';

type UnifiedLoginResponse =
  | { role: 'admin'; token: string; admin: AdminUserPublic }
  | { role: 'member'; token: string; member: MemberPublic };

export function UnifiedAuthScreen({ onSuccess }: UnifiedAuthScreenProps) {
  const { lang, t } = useLanguage();
  const savedIdentifier = (() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(REMEMBER_IDENTIFIER_KEY) || '';
    } catch {
      return '';
    }
  })();

  const [authMode, setAuthMode] = useState<'login' | 'create'>('login');
  const [identifier, setIdentifier] = useState(savedIdentifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(savedIdentifier));
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      if (authMode === 'create') {
        const cleanEmail = identifier.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          throw new Error(
            lang === 'bn'
              ? 'সঠিক জিমেইল (Gmail) ঠিকানা লিখুন।'
              : 'Please enter a valid Gmail address.'
          );
        }
        const res = await apiRequest<{
          pendingApproval?: boolean;
          token?: string;
          member: MemberPublic;
        }>('/api/auth/member/register', {
          method: 'POST',
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        try {
          if (rememberMe) {
            window.localStorage.setItem(REMEMBER_IDENTIFIER_KEY, cleanEmail);
          } else {
            window.localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
          }
        } catch {
          // ignore storage restrictions
        }

        if (res.pendingApproval || !res.token) {
          setAdminToken(null);
          setMemberToken(null);
          setAuthMode('login');
          setIdentifier(cleanEmail);
          setPassword('');
          setNotice(
            lang === 'bn'
              ? `আপনার আইডি (${res.member.memberId}) তৈরি হয়েছে। অ্যাডমিন অনুমোদন দিলে এই জিমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করতে পারবেন।`
              : `Your Member ID (${res.member.memberId}) has been created. You can sign in once the Admin approves your ID.`
          );
          return;
        }

        setAdminToken(null);
        setMemberToken(res.token);
        onSuccess('member');
        return;
      }

      const res = await apiRequest<UnifiedLoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });

      try {
        if (rememberMe) {
          window.localStorage.setItem(REMEMBER_IDENTIFIER_KEY, identifier.trim());
        } else {
          window.localStorage.removeItem(REMEMBER_IDENTIFIER_KEY);
        }
      } catch {
        // ignore storage restrictions
      }

      if (res.role === 'admin') {
        setMemberToken(null);
        setAdminToken(res.token);
        onSuccess('admin');
      } else {
        setAdminToken(null);
        setMemberToken(res.token);
        onSuccess('member');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : authMode === 'create'
          ? 'Could not create ID'
          : 'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalAuthLayout
      role="unified"
      authMode={authMode}
      onRegisterClick={() => {
        setError('');
        setNotice('');
        setIdentifier('');
        setPassword('');
        setAuthMode('create');
      }}
      onBackToLogin={() => {
        setError('');
        setNotice('');
        setIdentifier(savedIdentifier);
        setPassword('');
        setAuthMode('login');
      }}
      identifier={identifier}
      onIdentifierChange={setIdentifier}
      password={password}
      onPasswordChange={setPassword}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      error={error}
      notice={notice}
      loading={loading}
      onSubmit={handleSubmit}
      identifierLabel={
        authMode === 'create'
          ? lang === 'bn'
            ? 'জিমেইল (Gmail) *'
            : 'Gmail Address *'
          : lang === 'bn'
          ? 'সদস্য আইডি / জিমেইল / মোবাইল নম্বর'
          : t('identifierLabel')
      }
      identifierPlaceholder={
        authMode === 'create'
          ? 'yourname@gmail.com'
          : lang === 'bn'
          ? 'সদস্য আইডি / জিমেইল / মোবাইল নম্বর'
          : 'yourname@gmail.com or HNS-0001'
      }
      passwordMinLength={6}
    />
  );
}
