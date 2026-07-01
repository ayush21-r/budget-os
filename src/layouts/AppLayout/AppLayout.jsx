import { BarChart3, LayoutDashboard, PanelLeftClose, Settings, SlidersHorizontal, WalletCards } from 'lucide-react';
import styles from './AppLayout.module.css';

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'setup', label: 'Monthly Setup', icon: SlidersHorizontal },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function AppLayout({ activePage, onNavigate, children }) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <WalletCards size={20} strokeWidth={2.2} />
          </div>
          <div>
            <strong>BudgetOS</strong>
            <span>Personal finance</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${activePage === item.id ? styles.active : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <PanelLeftClose size={18} />
          <span>Local budget workspace</span>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.mobileBrand}>
          <div className={styles.brand}>
            <div className={styles.brandMark}>
              <WalletCards size={19} />
            </div>
            <strong>BudgetOS</strong>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
