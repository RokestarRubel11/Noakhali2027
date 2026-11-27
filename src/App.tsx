/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
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

  const navigateView = (next: PortalView) => {
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
  };

  if (view === 'admin-app') {
    return <AdminDashboard onLogout={() => navigateView('auth')} />;
  }

  if (view === 'member-app') {
    return <MemberDashboard onLogout={() => navigateView('auth')} />;
  }

  return (
    <UnifiedAuthScreen
      onSuccess={(role) => navigateView(role === 'admin' ? 'admin-app' : 'member-app')}
    />
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppShell />
    </LanguageProvider>
  );
}
