import { useEffect, useMemo, useState } from 'react';
import AppLayout from './layouts/AppLayout/AppLayout.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import MonthlySetup from './pages/MonthlySetup/MonthlySetup.jsx';
import Analytics from './pages/Analytics/Analytics.jsx';
import Settings from './pages/Settings/Settings.jsx';
import budgetData from './data/budgetData.js';
import { calculateBudgetOverview } from './utils/budgetUtils.js';
import { loadBudgetState, saveBudgetState } from './utils/storage.js';

const pages = {
  dashboard: Dashboard,
  setup: MonthlySetup,
  analytics: Analytics,
  settings: Settings,
};

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [budgetState, setBudgetState] = useState(() => loadBudgetState(budgetData));
  const [activeMonthId, setActiveMonthId] = useState('current');

  useEffect(() => {
    saveBudgetState(budgetState);
  }, [budgetState]);

  const selectedMonth = useMemo(() => {
    if (activeMonthId === 'current') return budgetState;
    return budgetState.history.find((month) => month.profile.monthId === activeMonthId) || budgetState;
  }, [activeMonthId, budgetState]);

  const overview = useMemo(() => calculateBudgetOverview(selectedMonth), [selectedMonth]);
  const ActivePage = pages[activePage];
  const isArchivedView = activeMonthId !== 'current';

  const monthOptions = useMemo(() => {
    return [
      { id: 'current', label: `${budgetState.profile.month} (Current)` },
      ...budgetState.history.map((month) => ({ id: month.profile.monthId, label: month.profile.month })),
    ];
  }, [budgetState.history, budgetState.profile.month]);

  return (
    <AppLayout activePage={activePage} onNavigate={setActivePage}>
      <ActivePage
        budgetState={selectedMonth}
        appState={budgetState}
        setBudgetState={setBudgetState}
        overview={overview}
        isArchivedView={isArchivedView}
        activeMonthId={activeMonthId}
        setActiveMonthId={setActiveMonthId}
        monthOptions={monthOptions}
        onNavigate={setActivePage}
      />
    </AppLayout>
  );
}

export default App;
