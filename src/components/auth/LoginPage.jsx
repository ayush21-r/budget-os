import { WalletCards } from 'lucide-react';
import Button from '../ui/Button/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './LoginPage.module.css';

function LoginPage() {
  const { error, login, loading } = useAuth();

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="login-title">
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <WalletCards size={22} strokeWidth={2.2} />
          </div>
          <strong>BudgetOS</strong>
        </div>

        <div className={styles.copy}>
          <h1 id="login-title">Welcome to BudgetOS</h1>
          <p>Manage your monthly budget with simplicity.</p>
        </div>

        <Button className={styles.loginButton} onClick={login} disabled={loading}>
          Continue with Google
        </Button>

        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}

export default LoginPage;
