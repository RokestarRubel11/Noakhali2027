import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiRequest, setMemberToken } from '../lib/api.ts';
import type { MemberPublic } from '../types.ts';
import { PortalAuthLayout } from './PortalAuthLayout.tsx';

interface MemberAuthScreenProps {
  onBack: () => void;
  onSuccess: (member: MemberPublic) => void;
}

const REMEMBER_MEMBER_KEY = 'hn_remember_member_id';

export function MemberAuthScreen({ onBack, onSuccess }: MemberAuthScreenProps) {
  const { t } = useLanguage();
  const savedIdentifier =
    typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_MEMBER_KEY) || '' : '';

  const [identifier, setIdentifier] = useState(savedIdentifier);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(savedIdentifier));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; member: MemberPublic }>(
        '/api/auth/member/login',
        {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        }
      );
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_MEMBER_KEY, identifier.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_MEMBER_KEY);
      }
      setMemberToken(res.token);
      onSuccess(res.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalAuthLayout
      role="member"
      onBack={onBack}
      identifier={identifier}
      onIdentifierChange={setIdentifier}
      password={password}
      onPasswordChange={setPassword}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      error={error}
      loading={loading}
      onSubmit={handleLogin}
      identifierLabel={t('identifierLabel')}
      identifierPlaceholder={t('identifierPlaceholder')}
      passwordMinLength={6}
    />
  );
}
