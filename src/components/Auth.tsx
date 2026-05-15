import { loginWithGoogle } from '../lib/firebase';
import { BackgroundPaths } from './ui/background-paths';

export function Auth() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <BackgroundPaths 
      title="Life Admin" 
      subtitle="Organize the essential, ignore the noise."
      onAction={handleLogin}
    />
  );
}
