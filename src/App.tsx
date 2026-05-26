/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, completeRedirectLogin, testConnection } from './lib/firebase';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    testConnection();

    const startAuth = async () => {
      try {
        await completeRedirectLogin();
      } catch (error) {
        console.error("Redirect login failed", error);
        if (isMounted) {
          const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
          setAuthError(`Google sign-in could not finish${code ? ` (${code})` : ''}. Try again in Safari or Chrome.`);
        }
      }

      if (!isMounted) return;

      unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (!isMounted) return;
        if (currentUser) {
          setAuthError('');
        }
        setUser(currentUser);
        setLoading(false);
      });
    };

    startAuth();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center font-sans text-stone-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-stone-900" />
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Initializing System</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <AnimatePresence mode="wait">
        {!user ? (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Auth initialError={authError} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Dashboard user={user} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
