import { useState } from 'react';
import { Apple } from 'lucide-react';
import { loginWithApple, loginWithGoogle } from '../lib/firebase';
import { InstallAppButton } from './InstallAppButton';
import { BackgroundPaths } from './ui/background-paths';

export function Auth() {
  const [loginError, setLoginError] = useState('');

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
      setLoginError('Sign-in could not start. Open LifeAdmin in Safari or Chrome and try again.');
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
          <button
            type="button"
            onClick={() => handleLogin('apple')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-black px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-stone-900"
          >
            <Apple className="h-4 w-4" />
            Sign in with Apple
          </button>
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
