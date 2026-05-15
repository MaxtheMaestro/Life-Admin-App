import { loginWithGoogle } from '../lib/firebase';
import { InstallAppButton } from './InstallAppButton';
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
      logoSrc="/life-admin-logo.png"
      logoAlt="Life Admin logo"
      title="Life Admin" 
      subtitle="Organize the essential, ignore the noise."
      onAction={handleLogin}
      secondaryAction={<InstallAppButton />}
    />
  );
}
