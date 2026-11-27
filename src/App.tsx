/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { UnifiedAuthScreen } from './components/UnifiedAuthScreen.tsx';
import { AdminDashboard } from './components/admin/AdminDashboard.tsx';
import { MemberDashboard } from './components/member/MemberDashboard.tsx';
import { getAdminToken, getMemberToken } from './lib/api.ts';

type PortalView = 'auth' | 'admin-app' | 'member-app';

function AppShell() {
  const [view, setView] = useState<PortalView>(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin') && getAdminToken()) {
      return 'admin-app';
    }
    if (path.startsWith('/member') && getMemberToken()) {
      return 'member-app';
    }
    if (getAdminToken()) return 'admin-app';
    if (getMemberToken()) return 'member-app';
    return 'auth';
  });

  const navigateView = useCallback((next: PortalView) => {
    setView(next);
    try {
      if (next === 'admin-app') {
        window.history.replaceState(null, '', '/admin');
      } else if (next === 'member-app') {
        window.history.replaceState(null, '', '/member');
      } else {
        window.history.replaceState(null, '', '/');
      }
    } catch {
      // ignore history errors in sandboxed frames
    }
  }, []);

  const handleLogout = useCallback(() => {
    navigateView('auth');
  }, [navigateView]);

  const handleAuthSuccess = useCallback(
    (role: 'admin' | 'member') => {
      navigateView(role === 'admin' ? 'admin-app' : 'member-app');
    },
    [navigateView]
  );

  if (view === 'admin-app') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (view === 'member-app') {
    return <MemberDashboard onLogout={handleLogout} />;
  }

  return <UnifiedAuthScreen onSuccess={handleAuthSuccess} />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
