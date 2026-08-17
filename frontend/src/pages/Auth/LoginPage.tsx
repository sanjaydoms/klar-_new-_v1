import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import LoginForm, { LoginResult } from '../../features/authentication/components/LoginForm';
import AccountNotVerified from '../../features/authentication/components/Auth/AccountNotVerified';
import AccountBlocked from '../../features/authentication/components/Auth/AccountBlocked';
import TooManyAttempts from '../../features/authentication/components/Auth/TooManyAttempts';
import AccountRejected from '../../features/authentication/components/Auth/AccountRejected';
import DashboardPage from '../DashboardPage/DashboardPage';

type AuthView =
  | 'LOGIN'
  | 'VERIFICATION_PENDING'
  | 'BLOCKED'
  | 'TOO_MANY_ATTEMPTS'
  | 'REJECTED'
  | 'DASHBOARD';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Added destructuring of login from useAuth
  const [view, setView] = useState<AuthView>('LOGIN');
  const [userEmail, setUserEmail] = useState('');
  const [reason, setReason] = useState('');

  const handleLoginResult = (result: LoginResult) => {
    if (result.type === 'VERIFICATION_PENDING') {
      setUserEmail(result.email);
      setReason(result.reason || '');
      setView('VERIFICATION_PENDING');
    } else if (result.type === 'BLOCKED') {
      setReason(result.reason || '');
      setView('BLOCKED');
    } else if (result.type === 'TOO_MANY_ATTEMPTS') {
      setReason(result.reason || '');
      setView('TOO_MANY_ATTEMPTS');
    } else if (result.type === 'REJECTED') {
      setReason(result.reason || '');
      setView('REJECTED');
    } else if (result.type === 'DASHBOARD' || result.type === 'ACTIVE') {
      if ('user' in result && result.user) {
        login(result.user);
      }
      setView('DASHBOARD');
    }
  };

  const handleNavigateToSignup = () => {
    navigate('/signup');
  };

  const handleContactSupport = () => {
    console.log('Contacting support...');
    // navigate('/support');
  };

  return (
    <>
      {view === 'LOGIN' && (
        <LoginForm onLoginResult={handleLoginResult} onNavigateToSignup={handleNavigateToSignup} />
      )}

      {view === 'VERIFICATION_PENDING' && (
        <AccountNotVerified
          email={userEmail}
          reason={reason}
          onResendLink={() => console.log('Resending link...')}
          onChangeEmail={() => setView('LOGIN')}
          onContactSupport={handleContactSupport}
        />
      )}

      {view === 'BLOCKED' && (
        <AccountBlocked
          reason={reason}
          onContactSupport={handleContactSupport}
          onBackToLogin={() => setView('LOGIN')}
        />
      )}

      {view === 'TOO_MANY_ATTEMPTS' && (
        <TooManyAttempts
          reason={reason}
          onResetPassword={() => console.log('Resetting password...')}
          onHelp={() => console.log('Showing help...')}
        />
      )}

      {view === 'REJECTED' && (
        <AccountRejected
          reason={reason}
          onContactSupport={handleContactSupport}
          onBackToLogin={() => setView('LOGIN')}
        />
      )}

      {view === 'DASHBOARD' && <DashboardPage onLogout={() => setView('LOGIN')} />}
    </>
  );
};

export default LoginPage;
