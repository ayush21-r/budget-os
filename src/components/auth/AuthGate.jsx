import LoginPage from './LoginPage.jsx';
import LoadingScreen from './LoadingScreen.jsx';
import { useAuth } from '../../hooks/useAuth.js';

function AuthGate({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <LoginPage />;
  }

  return children;
}

export default AuthGate;
