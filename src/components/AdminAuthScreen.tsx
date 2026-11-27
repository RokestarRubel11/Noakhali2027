import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.tsx';
import { apiRequest, setAdminToken } from '../lib/api.ts';
import type { AdminUserPublic } from '../types.ts';
import { PortalAuthLayout } from './PortalAuthLayout.tsx';

interface AdminAuthScreenProps {
  onBack: () => void;
  onSuccess: (admin: AdminUserPublic) => void;
}

const REMEMBER_ADMIN_KEY = 'hn_remember_admin_email';

export function AdminAuthScreen({ onBack, onSuccess }: AdminAuthScreenProps) {
  const { t } = useLanguage();
  const savedEmail =
    typeof window !== 'undefined' ? window.localStorage.getItem(REMEMBER_ADMIN_KEY) || '' : '';

  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(savedEmail));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; admin: AdminUserPublic }>(
        '/api/auth/admin/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      );
      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_ADMIN_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_ADMIN_KEY);
      }
      setAdminToken(res.token);
      onSuccess(res.admin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalAuthLayout
      role="admin"
      onBack={onBack}
      identifier={email}
      onIdentifierChange={setEmail}
      password={password}
      onPasswordChange={setPassword}
      rememberMe={rememberMe}
      onRememberMeChange={setRememberMe}
      error={error}
      loading={loading}
      onSubmit={handleSubmit}
      identifierLabel={t('emailLabel')}
      identifierPlaceholder="roki255190@gmail.com"
    />
  );
}
