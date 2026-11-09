import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RetainOpsProvider } from './context/RetainOpsContext';
import { AppShell } from './components/layout/AppShell';
import { Portfolio } from './pages/Portfolio';
import { OutreachQueue } from './pages/OutreachQueue';
import { AutomationLane } from './pages/AutomationLane';
import { ClearedAccounts } from './pages/ClearedAccounts';
import { AllMerchants } from './pages/AllMerchants';
import { Method } from './pages/Method';
import { MerchantPage } from './pages/MerchantPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <RetainOpsProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Portfolio />} />
            <Route path="/queue" element={<OutreachQueue />} />
            <Route path="/automation" element={<AutomationLane />} />
            <Route path="/cleared" element={<ClearedAccounts />} />
            <Route path="/merchants" element={<AllMerchants />} />
            <Route path="/method" element={<Method />} />
            <Route path="/merchant/:id" element={<MerchantPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </RetainOpsProvider>
    </BrowserRouter>
  );
};

export default App;
