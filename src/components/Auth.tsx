import { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { InstallAppButton } from './InstallAppButton';
import { BackgroundPaths } from './ui/background-paths';

export function Auth() {
  const [loginError, setLoginError] = useState('');

  const handleLogin = async () => {
    setLoginError('');
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
      setLoginError('Sign-in could not start on this browser. Open LifeAdmin in Safari or Chrome and try again.');
    }
  };

  return (
    <BackgroundPaths 
      logoSrc="/life-admin-logo.png"
      logoAlt="Life Admin logo"
      title="Life Admin" 
      subtitle="Organize the essential, ignore the noise."
      onAction={handleLogin}
      secondaryAction={
        <div className="flex flex-col items-center gap-3">
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
