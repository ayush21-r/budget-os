import { Download, LogOut, Moon, Repeat, RotateCcw, Tags } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Modal from '../../components/ui/Modal/Modal.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { getNextMonth } from '../../utils/dateUtils.js';
import styles from './Settings.module.css';

const settingsSections = [
  { title: 'Manage Categories', description: 'Review budget labels, category colors, and spending groups.', icon: Tags },
  { title: 'Recurring Expenses', description: 'Reserve space for rent, utilities, memberships, and predictable bills.', icon: Repeat },
  { title: 'Export Data', description: 'Prepare budget summaries for CSV or monthly reports.', icon: Download },
  { title: 'Theme', description: 'Choose how BudgetOS should feel during daily planning sessions.', icon: Moon },
];

function Settings({ appState, setBudgetState, onNavigate, setActiveMonthId }) {
  usePageTitle('Settings');
  const { user, logout } = useAuth();
  const [isSavingsOpen, setIsSavingsOpen] = useState(false);
  const [savingsGoal, setSavingsGoal] = useState(String(appState.profile.savingsGoal));
  const [message, setMessage] = useState('');

  function handleSavingsSubmit(event) {
    event.preventDefault();
    if (Number(savingsGoal) < 0) {
      setMessage('Savings goal cannot be negative.');
      return;
    }
    if (Number(savingsGoal) > Number(appState.profile.allowance)) {
      setMessage('Savings goal cannot exceed monthly allowance.');
      return;
    }

    setBudgetState((current) => ({
      ...current,
      profile: { ...current.profile, savingsGoal: Number(savingsGoal) },
    }));
    setIsSavingsOpen(false);
    setMessage('Savings goal updated.');
  }

  function handleMonthlyReset() {
    const nextMonth = getNextMonth(appState.profile);

    setBudgetState((current) => ({
      ...current,
      history: [
        {
          profile: { ...current.profile },
          categories: current.categories.map((category) => ({ ...category })),
          expenses: current.expenses.map((expense) => ({ ...expense })),
        },
        ...(current.history || []),
      ],
      profile: {
        ...current.profile,
        month: nextMonth.month,
        monthId: nextMonth.monthId,
      },
      expenses: [],
    }));
    setActiveMonthId('current');
    setMessage('Current month archived and reset.');
  }

  function handleExportJson() {
    const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'budgetos-export.json';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('JSON export created.');
  }

  function handleConfigure(title) {
    if (title === 'Manage Categories') onNavigate('setup');
    if (title === 'Export Data') handleExportJson();
    if (title === 'Recurring Expenses') setMessage('Recurring expenses are ready for Phase 3.');
    if (title === 'Theme') setMessage('Theme controls are reserved for a later phase.');
  }

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow="Settings"
        title="Quiet controls for later."
        description="Manage current month data, savings, resets, and exports without leaving the frontend."
      />

      {message ? <p className={styles.message}>{message}</p> : null}

      <Panel title="User Profile" subtitle="Your connected Google account information." className={styles.profilePanel}>
        <div className={styles.profileBox}>
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Profile" className={styles.profileAvatar} />
          ) : (
            <div className={styles.profileAvatarFallback}>
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
          <div className={styles.profileDetails}>
            <h2>{user?.user_metadata?.full_name || 'No Name'}</h2>
            <p>{user?.email}</p>
          </div>
        </div>
      </Panel>

      <Panel
        title="Workspace Settings"
        subtitle="Local Storage powered settings for the current BudgetOS workspace."
        actions={
          <>
            <Button variant="secondary" icon={RotateCcw} onClick={handleMonthlyReset}>Reset Current Month</Button>
            <Button variant="secondary" icon={Download} onClick={handleExportJson}>Export JSON</Button>
            <Button variant="secondary" icon={LogOut} onClick={logout}>Log Out</Button>
          </>
        }
      >
        <div className={styles.settingsGrid}>
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <article className={styles.settingCard} key={section.title}>
                <div className={styles.iconBox}>
                  <Icon size={21} />
                </div>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
                <Button variant="secondary" onClick={() => handleConfigure(section.title)}>Configure</Button>
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="Manage Savings Goal" subtitle="Update the monthly savings target used in every calculation." className={styles.savingsPanel}>
        <form className={styles.savingsForm} onSubmit={handleSavingsSubmit}>
          <Input label="Savings Goal" id="settings-savings-goal" type="number" min="0" value={savingsGoal} onChange={(event) => setSavingsGoal(event.target.value)} />
          <Button type="submit">Save Savings Goal</Button>
        </form>
      </Panel>

      <Modal title="Manage savings goal" isOpen={isSavingsOpen} onClose={() => setIsSavingsOpen(false)}>
        <form className={styles.savingsForm} onSubmit={handleSavingsSubmit}>
          <Input label="Savings Goal" id="modal-savings-goal" type="number" min="0" value={savingsGoal} onChange={(event) => setSavingsGoal(event.target.value)} />
          <Button type="submit">Save Savings Goal</Button>
        </form>
      </Modal>
    </div>
  );
}

export default Settings;
