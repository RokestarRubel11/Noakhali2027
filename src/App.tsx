/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useCallback, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { UnifiedAuthScreen } from './components/UnifiedAuthScreen.tsx';
import { getAdminToken, getMemberToken } from './lib/api.ts';

const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard.tsx').then((m) => ({ default: m.AdminDashboard }))
);
const MemberDashboard = lazy(() =>
  import('./components/member/MemberDashboard.tsx').then((m) => ({ default: m.MemberDashboard }))
);

type PortalView = 'auth' | 'admin-app' | 'member-app';

function PortalLoader() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#EAF3FF] text-[#041E5C]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-9 h-9 border-4 border-[#09328E]/20 border-t-[#09328E] rounded-full animate-spin" />
        <p className="text-sm font-semibold text-[#041E5C]/80">লোড হচ্ছে...</p>
      </div>
    </div>
  );
}

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
    return (
      <Suspense fallback={<PortalLoader />}>
        <AdminDashboard onLogout={handleLogout} />
      </Suspense>
    );
  }

  if (view === 'member-app') {
    return (
      <Suspense fallback={<PortalLoader />}>
        <MemberDashboard onLogout={handleLogout} />
      </Suspense>
    );
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
