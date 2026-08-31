import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from '@/appContext';
import { AppShell } from '@/components/AppShell';
import { Login } from '@/pages/Login';
import { OperatorDashboard } from '@/pages/OperatorDashboard';
import { ImportHistory } from '@/pages/ImportHistory';
import { ReviewerDashboard } from '@/pages/ReviewerDashboard';
import { ExceptionQueue } from '@/pages/ExceptionQueue';
import { LoanDetail } from '@/pages/LoanDetail';
import { ConsumerDashboard } from '@/pages/ConsumerDashboard';
import { VerifiedRecords } from '@/pages/VerifiedRecords';
import { VerifiedRecordDetail } from '@/pages/VerifiedRecordDetail';
import { AuditTrail } from '@/pages/AuditTrail';
import type { Role } from '@/types';
import type { ReactNode } from 'react';

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { role: current } = useApp();
  const loc = useLocation();
  if (!current) return <Navigate to="/" state={{ from: loc }} replace />;
  if (current !== role) return <Navigate to={`/${current}`} replace />;
  return <>{children}</>;
}

function RoleRoutes() {
  const { role } = useApp();
  if (!role) return <Navigate to="/" replace />;
  return (
    <AppShell>
      <Routes>
        <Route path="/operator" element={<RequireRole role="operator"><OperatorDashboard /></RequireRole>} />
        <Route path="/operator/imports" element={<RequireRole role="operator"><ImportHistory /></RequireRole>} />
        <Route path="/reviewer" element={<RequireRole role="reviewer"><ReviewerDashboard /></RequireRole>} />
        <Route path="/reviewer/queue" element={<RequireRole role="reviewer"><ExceptionQueue /></RequireRole>} />
        <Route path="/reviewer/loan/:loanId" element={<RequireRole role="reviewer"><LoanDetail /></RequireRole>} />
        <Route path="/consumer" element={<RequireRole role="consumer"><ConsumerDashboard /></RequireRole>} />
        <Route path="/consumer/verified" element={<RequireRole role="consumer"><VerifiedRecords /></RequireRole>} />
        <Route path="/consumer/verified/:loanId" element={<RequireRole role="consumer"><VerifiedRecordDetail /></RequireRole>} />
        <Route path="/consumer/audit/:loanId" element={<RequireRole role="consumer"><AuditTrail /></RequireRole>} />
        <Route path="*" element={<Navigate to={`/${role}`} replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/*" element={<RoleRoutes />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
