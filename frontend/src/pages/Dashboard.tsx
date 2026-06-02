/**
 * Dashboard — Redirect to unified Operations Dashboard
 *
 * As of v1.56, the Dashboard content has been consolidated into
 * the Operations Workbench (/operations). This component simply
 * redirects to /operations.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ProjectScope } from '../types';

interface DashboardPageProps {
  scope: ProjectScope;
}

const DashboardPage: React.FC<DashboardPageProps> = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/operations', { replace: true });
  }, [navigate]);

  return null;
};

export default DashboardPage;
