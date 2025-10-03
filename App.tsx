
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ImportPage from './pages/ImportPage';
import SettingsPage from './pages/SettingsPage';
import ProposalPage from './pages/ProposalPage';
import QuickAnalysisPage from './pages/QuickAnalysisPage';
import CsvProposalPage from './pages/CsvProposalPage';
import ArchivedProposalsPage from './pages/ArchivedProposalsPage'; // Import new page
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import { Role } from './types';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <Main />
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  );
};

const Main: React.FC = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/import" element={<AdminRoute role={user.role}><ImportPage /></AdminRoute>} />
            <Route path="/settings" element={<AdminRoute role={user.role}><SettingsPage /></AdminRoute>} />
            <Route path="/proposal" element={<ProposalPage />} />
            <Route path="/quick-analysis" element={<QuickAnalysisPage />} />
            <Route path="/csv-proposal" element={<CsvProposalPage />} />
            <Route path="/archived-proposals" element={<ArchivedProposalsPage />} /> {/* Add new route */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

interface AdminRouteProps {
  children: React.ReactElement;
  role: Role;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children, role }) => {
  if (role !== 'Admin') {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

export default App;
