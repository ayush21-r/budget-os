import { useMemo, useState } from 'react';
import AppLayout from './layouts/AppLayout/AppLayout.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import MonthlySetup from './pages/MonthlySetup/MonthlySetup.jsx';
import Analytics from './pages/Analytics/Analytics.jsx';
import Settings from './pages/Settings/Settings.jsx';
import RecurringExpenses from './pages/RecurringExpenses/RecurringExpenses.jsx';
import LoadingScreen from './components/auth/LoadingScreen.jsx';
import { useBudgetWorkspace } from './hooks/useBudgetWorkspace.js';
import { calculateBudgetOverview } from './utils/budgetUtils.js';

const pages = {
  dashboard: Dashboard,
  setup: MonthlySetup,
  analytics: Analytics,
  recurring: RecurringExpenses,
  settings: Settings,
};

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const { workspace, loading, error, actions } = useBudgetWorkspace();

  const selectedMonth = useMemo(() => {
    if (!workspace) return null;
    return workspace;
  }, [workspace]);

  const overview = useMemo(() => (selectedMonth ? calculateBudgetOverview(selectedMonth) : null), [selectedMonth]);
  const ActivePage = pages[activePage];
  const isArchivedView = Boolean(selectedMonth?.profile.archived);

  const monthOptions = useMemo(() => {
    if (!workspace) return [];
    return [
      { id: workspace.profile.id, label: `${workspace.profile.month}${workspace.profile.archived ? '' : ' (Current)'}` },
      ...workspace.history.map((month) => ({ id: month.profile.id, label: month.profile.month })),
    ];
  }, [workspace]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!selectedMonth || !overview) {
    return (
      <AppLayout activePage={activePage} onNavigate={setActivePage}>
        <div role="alert">{error || 'Unable to load BudgetOS workspace.'}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      {error ? <div role="alert">{error}</div> : null}
      <ActivePage
        budgetState={selectedMonth}
        appState={workspace}
        actions={actions}
        overview={overview}
        isArchivedView={isArchivedView}
        activeMonthId={workspace.profile.id}
        setActiveMonthId={actions.selectMonth}
        monthOptions={monthOptions}
        onNavigate={setActivePage}
      />
    </AppLayout>
  );
}

export default App;
