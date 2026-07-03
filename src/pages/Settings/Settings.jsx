import { Download, FileJson, LogOut, Repeat, RotateCcw, Tags, Trash2, User, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Dropdown from '../../components/ui/Dropdown/Dropdown.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { calculateBudgetOverview } from '../../utils/budgetUtils.js';
import BudgetReport from '../../components/BudgetReport/BudgetReport.jsx';
import styles from './Settings.module.css';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const settingsSections = [
  { title: 'Manage Categories', description: 'Review budget labels, category colors, and spending groups.', icon: Tags },
  { title: 'New Month', description: 'Open the current calendar month with default planning values.', icon: Repeat },
  { title: 'Export Data', description: 'Prepare budget summaries for CSV or monthly reports.', icon: Download },
  { title: 'Import', description: 'Validate an exported BudgetOS JSON file before import.', icon: FileJson },
  { title: 'Delete Month', description: 'Delete the selected month and return to a fresh month.', icon: Trash2 },
  { title: 'Reset Data', description: 'Delete all budget data and recreate a clean current month.', icon: RotateCcw },
  { title: 'Account', description: 'Review the authenticated account connected to Supabase.', icon: User },
  { title: 'Supabase Session', description: 'Confirm that a live Supabase session is active.', icon: User },
];

function Settings({ appState, actions, onNavigate }) {
  usePageTitle('Settings');
  const { user, logout } = useAuth();
  const [savings_goal, setSavingsGoal] = useState(String(appState.profile.savings_goal));
  const [defaultAllowance, setDefaultAllowance] = useState(String(appState.settings?.defaultAllowance ?? appState.profile.allowance ?? 0));
  const [defaultSavingsGoal, setDefaultSavingsGoal] = useState(String(appState.settings?.defaultSavingsGoal ?? appState.profile.savings_goal ?? 0));
  const [currency, setCurrency] = useState(appState.settings?.currency || 'INR');
  const [theme, setTheme] = useState(appState.settings?.theme || 'light');
  const [notifications, setNotifications] = useState(Boolean(appState.settings?.notifications));
  const [firstDayOfMonth, setFirstDayOfMonth] = useState(String(appState.settings?.firstDayOfMonth ?? 1));
  const [message, setMessage] = useState('');
  const importInputRef = useRef(null);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportRef = useRef(null);
  const overview = calculateBudgetOverview(appState);

  useEffect(() => {
    setSavingsGoal(String(appState.profile.savings_goal));
    setDefaultAllowance(String(appState.settings?.defaultAllowance ?? appState.profile.allowance ?? 0));
    setDefaultSavingsGoal(String(appState.settings?.defaultSavingsGoal ?? appState.profile.savings_goal ?? 0));
    setCurrency(appState.settings?.currency || 'INR');
    setTheme(appState.settings?.theme || 'light');
    setNotifications(Boolean(appState.settings?.notifications));
    setFirstDayOfMonth(String(appState.settings?.firstDayOfMonth ?? 1));
  }, [appState.profile.allowance, appState.profile.savings_goal, appState.settings?.currency, appState.settings?.defaultAllowance, appState.settings?.defaultSavingsGoal, appState.settings?.notifications, appState.settings?.theme, appState.settings?.firstDayOfMonth]);

  async function handleSavingsSubmit(event) {
    event.preventDefault();
    const nextSavings = Number(savings_goal);
    if (nextSavings < 0) {
      setMessage('Savings goal cannot be negative.');
      return;
    }
    if (nextSavings > Number(appState.profile.allowance)) {
      setMessage('Savings goal cannot exceed monthly allowance.');
      return;
    }

    try {
      await actions.updatePlan(appState.profile.id, { savings_goal: nextSavings });
      setMessage('Savings goal updated.');
    } catch (settingsError) {
      setMessage(settingsError.message || 'Unable to update savings goal.');
    }
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

  async function handleDownloadPdf() {
    setIsGeneratingPdf(true);
    setMessage('Generating PDF Report, please wait...');

    setTimeout(async () => {
      try {
        const { jsPDF } = await import('jspdf');
        const html2canvas = (await import('html2canvas')).default;

        const container = reportRef.current;
        if (!container) throw new Error('Report template container not found.');

        // Find child elements using a custom selector or query
        const pages = container.querySelectorAll('[class*="pdfPage"]');
        if (!pages.length) throw new Error('No PDF pages found in container.');

        const pdf = new jsPDF('p', 'mm', 'a4');

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            logging: false,
          });
          const imgData = canvas.toDataURL('image/png');

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        }

        const fileName = `budgetos-report-${appState.profile.month.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
        pdf.save(fileName);
        setMessage('PDF Report downloaded successfully.');
      } catch (pdfError) {
        console.error(pdfError);
        setMessage(pdfError.message || 'Error generating PDF report.');
      } finally {
        setIsGeneratingPdf(false);
      }
    }, 1200);
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await actions.importWorkspace(parsed);
      setMessage('BudgetOS JSON import completed.');
    } catch (importError) {
      setMessage(importError.message || 'Unable to import JSON.');
    } finally {
      event.target.value = '';
    }
  }

  async function handlePreferencesSubmit(event) {
    event.preventDefault();
    try {
      await actions.updateSettings({
        currency: currency.trim().toUpperCase(),
        theme,
        notifications,
        firstDayOfMonth: Number(firstDayOfMonth),
        defaultAllowance: Number(defaultAllowance),
        defaultSavingsGoal: Number(defaultSavingsGoal),
      });
      setMessage('Workspace preferences saved.');
    } catch (settingsError) {
      setMessage(settingsError.message || 'Unable to save workspace preferences.');
    }
  }

  async function handleConfigure(title) {
    try {
      if (title === 'Manage Categories') onNavigate('setup');
      if (title === 'Export Data') handleExportJson();
      if (title === 'New Month') {
        await actions.createNewMonth();
        setMessage(`Created a new month using the saved defaults of ${appState.settings?.defaultAllowance ?? appState.profile.allowance} and ${appState.settings?.defaultSavingsGoal ?? appState.profile.savings_goal}.`);
      }
      if (title === 'Delete Month') {
        await actions.deleteMonth(appState.profile.id);
        await actions.createNewMonth();
        setMessage('Selected month deleted.');
      }
      if (title === 'Reset Data') {
        await actions.resetAllData();
        setMessage('All budget data reset.');
      }
      if (title === 'Import') {
        importInputRef.current?.click();
      }
      if (title === 'Account') setMessage(user?.email ? `Signed in as ${user.email}.` : 'No account email available.');
      if (title === 'Supabase Session') setMessage(user?.id ? `Active Supabase session for ${user.id}.` : 'No active Supabase session.');
    } catch (settingsError) {
      setMessage(settingsError.message || 'Unable to update settings.');
    }
  }

  return (
    <div className="pageFade">
      <PageHeader
        eyebrow="Settings"
        title="Quiet controls for later."
        description="Manage current month data, savings, resets, and exports without leaving the frontend."
      />

      {message ? <p className={styles.message}>{message}</p> : null}

      {/* Hidden print report container */}
      {isGeneratingPdf && (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
          <BudgetReport
            budgetState={appState}
            appState={appState}
            overview={overview}
            reportRef={reportRef}
          />
        </div>
      )}

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
        subtitle="Supabase powered settings for the current BudgetOS workspace."
        actions={
          <>
            <Button variant="secondary" icon={RotateCcw} onClick={() => handleConfigure('New Month')}>New Month</Button>
            <Button variant="secondary" icon={FileText} onClick={handleDownloadPdf} disabled={isGeneratingPdf}>
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            </Button>
            <Button variant="secondary" icon={Download} onClick={handleExportJson}>Export JSON</Button>
            <Button variant="secondary" icon={LogOut} onClick={logout}>Log Out</Button>
          </>
        }
      >
        <input ref={importInputRef} type="file" accept="application/json" onChange={handleImportFile} style={{ display: 'none' }} />
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
          <Input label="Savings Goal" id="settings-savings-goal" type="number" min="0" value={savings_goal} onChange={(event) => setSavingsGoal(event.target.value)} />
          <Button type="submit">Save Savings Goal</Button>
        </form>
      </Panel>

      <Panel title="Workspace Preferences" subtitle="Stored in Supabase settings and used as defaults for new months." className={styles.savingsPanel}>
        <form className={styles.preferenceForm} onSubmit={handlePreferencesSubmit}>
          <div className={styles.preferenceGrid}>
            <Input label="Default Allowance" id="settings-default-allowance" type="number" min="0" value={defaultAllowance} onChange={(event) => setDefaultAllowance(event.target.value)} />
            <Input label="Default Savings Goal" id="settings-default-savings-goal" type="number" min="0" value={defaultSavingsGoal} onChange={(event) => setDefaultSavingsGoal(event.target.value)} />
            <Input label="Currency" id="settings-currency" maxLength={8} value={currency} onChange={(event) => setCurrency(event.target.value)} />
            <Dropdown label="Theme" id="settings-theme" value={theme} onChange={(event) => setTheme(event.target.value)}>
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Dropdown>
            <Input label="First Day Of Month" id="settings-first-day-of-month" type="number" min="1" max="31" value={firstDayOfMonth} onChange={(event) => setFirstDayOfMonth(event.target.value)} />
          </div>

          <label className={styles.checkboxField} htmlFor="settings-notifications">
            <input
              id="settings-notifications"
              type="checkbox"
              checked={notifications}
              onChange={(event) => setNotifications(event.target.checked)}
            />
            <span>Notifications enabled</span>
          </label>

          <Button type="submit">Save Preferences</Button>
        </form>
      </Panel>
    </div>
  );
}

export default Settings;
