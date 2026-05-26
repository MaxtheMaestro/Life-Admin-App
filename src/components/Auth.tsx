import { useState } from 'react';
import { Apple } from 'lucide-react';
import { loginWithApple, loginWithGoogle } from '../lib/firebase';
import { InstallAppButton } from './InstallAppButton';
import { BackgroundPaths } from './ui/background-paths';

const appleSignInEnabled = import.meta.env.VITE_ENABLE_APPLE_AUTH === 'true';

export function Auth() {
  const [loginError, setLoginError] = useState('');

  const getLoginErrorMessage = (error: unknown, provider: 'google' | 'apple') => {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';

    if (code === 'auth/operation-not-allowed' && provider === 'apple') {
      return 'Apple sign-in is not enabled yet. Enable Apple in Firebase Authentication and finish Apple Developer setup.';
    }

    if (code === 'auth/unauthorized-domain') {
      return 'This domain is not authorized for sign-in. Add life-admin-2wtl.onrender.com in Firebase Authentication settings.';
    }

    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      return 'Sign-in was cancelled. Try again when you are ready.';
    }

    return `Sign-in could not start${code ? ` (${code})` : ''}. Open LifeAdmin in Safari or Chrome and try again.`;
  };

  const handleLogin = async (provider: 'google' | 'apple') => {
    setLoginError('');
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithApple();
      }
    } catch (error) {
      console.error("Login failed", error);
      setLoginError(getLoginErrorMessage(error, provider));
    }
  };

  return (
    <BackgroundPaths 
      logoSrc="/life-admin-logo.png"
      logoAlt="Life Admin logo"
      title="Life Admin" 
      subtitle="Organize the essential, ignore the noise."
      onAction={() => handleLogin('google')}
      actionLabel="Sign in with Google"
      secondaryAction={
        <div className="flex flex-col items-center gap-3">
          {appleSignInEnabled && (
            <button
              type="button"
              onClick={() => handleLogin('apple')}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-black px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-stone-900"
            >
              <Apple className="h-4 w-4" />
              Sign in with Apple
            </button>
          )}
          <InstallAppButton />
          {loginError && (
            <p className="max-w-sm rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold uppercase tracking-widest text-red-500">
              {loginError}
            </p>
          )}
        </div>
      }
    />
  );
}
