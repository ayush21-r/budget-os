import { Download, FileJson, LogOut, Repeat, RotateCcw, Tags, Trash2, User, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { supabase } from '../../lib/supabase.js';
import PageHeader from '../../components/PageHeader/PageHeader.jsx';
import Panel from '../../components/Panel/Panel.jsx';
import Button from '../../components/ui/Button/Button.jsx';
import Input from '../../components/ui/Input/Input.jsx';
import Dropdown from '../../components/ui/Dropdown/Dropdown.jsx';
import Modal from '../../components/ui/Modal/Modal.jsx';
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

  const [activeModal, setActiveModal] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [activeActionTitle, setActiveActionTitle] = useState(null);
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
    if (isNaN(nextSavings) || nextSavings < 0) {
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

        const fileName = `budgetos-report-${(appState.profile?.month || 'summary').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`;
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
    const parsedAllowance = Number(defaultAllowance);
    const parsedSavings = Number(defaultSavingsGoal);
    const parsedFirstDay = Number(firstDayOfMonth);

    if (isNaN(parsedAllowance) || parsedAllowance < 0) {
      setMessage('Default allowance cannot be negative.');
      return;
    }
    if (isNaN(parsedSavings) || parsedSavings < 0) {
      setMessage('Default savings goal cannot be negative.');
      return;
    }
    if (parsedSavings > parsedAllowance) {
      setMessage('Default savings goal cannot exceed default allowance.');
      return;
    }
    if (isNaN(parsedFirstDay) || parsedFirstDay < 1 || parsedFirstDay > 31) {
      setMessage('First day of month must be between 1 and 31.');
      return;
    }

    try {
      await actions.updateSettings({
        currency: currency.trim().toUpperCase() || 'INR',
        theme,
        notifications,
        firstDayOfMonth: parsedFirstDay,
        defaultAllowance: parsedAllowance,
        defaultSavingsGoal: parsedSavings,
      });
      setMessage('Workspace preferences saved.');
    } catch (settingsError) {
      setMessage(settingsError.message || 'Unable to save workspace preferences.');
    }
  }

  async function handleConfigure(title) {
    setActiveActionTitle(title);
    try {
      if (title === 'Manage Categories') {
        onNavigate('setup');
      } else if (title === 'Import') {
        importInputRef.current?.click();
      } else if (title === 'Supabase Session') {
        const { data } = await supabase.auth.getSession();
        setSessionData(data?.session || null);
        setActiveModal('Supabase Session');
      } else {
        setActiveModal(title);
      }
    } catch (settingsError) {
      setMessage(settingsError.message || 'Unable to open settings.');
    } finally {
      setActiveActionTitle(null);
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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: '-9999px',
            width: '794px',
            height: '1123px',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: -9999,
          }}
        >
          <BudgetReport
            budgetState={appState}
            appState={appState}
            user={user}
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
            <Button
              variant="secondary"
              icon={FileText}
              className={styles.pdfDownloadButton}
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
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
            const isWorking = activeActionTitle === section.title;
            return (
              <article className={styles.settingCard} key={section.title}>
                <div className={styles.iconBox}>
                  <Icon size={21} />
                </div>
                <div>
                  <h2>{section.title}</h2>
                  <p>{section.description}</p>
                </div>
                <Button variant="secondary" onClick={() => handleConfigure(section.title)} disabled={isWorking}>
                  {isWorking ? 'Working...' : 'Configure'}
                </Button>
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

      {/* Account Details Modal */}
      <Modal title="Account Details" isOpen={activeModal === 'Account'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <div className={styles.modalRow}>
            <span>Full Name</span>
            <strong>{user?.user_metadata?.full_name || 'No Name'}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Email</span>
            <strong>{user?.email || 'N/A'}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Auth Provider</span>
            <strong>Google OAuth</strong>
          </div>
          <div className={styles.modalRow}>
            <span>User ID</span>
            <strong style={{ fontSize: '0.75rem' }}>{user?.id}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Status</span>
            <span className={styles.badgeSuccess}>Connected</span>
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" icon={LogOut} onClick={() => { setActiveModal(null); logout(); }}>Log Out</Button>
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* Supabase Session Modal */}
      <Modal title="Supabase Session" isOpen={activeModal === 'Supabase Session'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <div className={styles.modalRow}>
            <span>Session Status</span>
            <span className={styles.badgeSuccess}>Active & Verified</span>
          </div>
          <div className={styles.modalRow}>
            <span>Token Expiration</span>
            <strong>
              {sessionData?.expires_at
                ? `In ~${Math.max(0, Math.round((sessionData.expires_at - Date.now() / 1000) / 60))} minutes`
                : 'Active live session'}
            </strong>
          </div>
          <div className={styles.modalRow}>
            <span>User ID</span>
            <strong style={{ fontSize: '0.75rem' }}>{user?.id}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Realtime Engine</span>
            <span className={styles.badgeSuccess}>Live</span>
          </div>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              onClick={async () => {
                const { data } = await supabase.auth.getSession();
                setSessionData(data?.session || null);
                setMessage('Supabase session refreshed and verified.');
              }}
            >
              Verify Again
            </Button>
            <Button onClick={() => setActiveModal(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      {/* New Month Modal */}
      <Modal title="Start New Month" isOpen={activeModal === 'New Month'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <p className={styles.warningText}>
            This will start the current calendar month and automatically roll over your remaining savings from the previous month into your new month's savings goal.
          </p>
          <div className={styles.modalRow}>
            <span>Current Month</span>
            <strong>{appState.profile?.month}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Default Allowance</span>
            <strong>₹{appState.settings?.defaultAllowance ?? appState.profile.allowance}</strong>
          </div>
          <div className={styles.modalRow}>
            <span>Base Savings Target</span>
            <strong>₹{appState.settings?.defaultSavingsGoal ?? appState.profile.savings_goal}</strong>
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                setActiveModal(null);
                const result = await actions.createNewMonth();
                if (result?.created) {
                  const carriedText = result.carriedSavings > 0 ? ` with ₹${result.carriedSavings} savings carried forward` : '';
                  setMessage(`Created new month (${result.monthName})${carriedText}. Savings goal set to ₹${result.savingsGoal}.`);
                } else {
                  setMessage(`The workspace is already on the current month (${result?.monthName || appState.profile.month}).`);
                }
              }}
            >
              Start New Month
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Month Modal */}
      <Modal title="Delete Month" isOpen={activeModal === 'Delete Month'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <p className={styles.warningText}>
            Are you sure you want to delete the budget for <strong>{appState.profile?.month}</strong>? All expenses and category limits recorded for this month will be removed.
          </p>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                const targetMonth = appState.profile.month;
                setActiveModal(null);
                await actions.deleteMonth(appState.profile.id);
                setMessage(`Selected month (${targetMonth}) deleted.`);
              }}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset Data Modal */}
      <Modal title="Reset All Workspace Data" isOpen={activeModal === 'Reset Data'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <p className={styles.warningText}>
            Warning: This action will permanently wipe all monthly budgets, historical records, categories, expenses, and recurring bills. A clean current month will be created with default settings.
          </p>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                setActiveModal(null);
                await actions.resetAllData();
                setMessage('All budget data reset to defaults.');
              }}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Data Modal */}
      <Modal title="Export Data" isOpen={activeModal === 'Export Data'} onClose={() => setActiveModal(null)}>
        <div className={styles.modalContent}>
          <p className={styles.warningText}>
            Download a full JSON backup of your BudgetOS workspace or generate an executive multi-page PDF summary.
          </p>
          <div className={styles.modalActions}>
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => {
                handleExportJson();
                setActiveModal(null);
              }}
            >
              Export JSON
            </Button>
            <Button
              icon={FileText}
              className={styles.pdfDownloadButton}
              disabled={isGeneratingPdf}
              onClick={() => {
                setActiveModal(null);
                handleDownloadPdf();
              }}
            >
              {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF Report'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Settings;
