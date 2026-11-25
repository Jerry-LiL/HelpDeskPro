import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { client } from './api';
import { RequireStaff, useAuth } from './auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketListPage } from './pages/TicketListPage';
import { UsersPage } from './pages/UsersPage';
import type { SlaWindow } from './types';

export function App() {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<SlaWindow[]>([]);

  useEffect(() => {
    if (!user || user.role === 'customer') {
      setPolicy([]);
      return;
    }
    client.slaPolicy().then(setPolicy).catch(() => setPolicy([]));
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireStaff />}>
        <Route element={<Layout policy={policy} />}>
          <Route path="/" element={<TicketListPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
