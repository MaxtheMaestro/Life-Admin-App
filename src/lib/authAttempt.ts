type ProviderId = 'google' | 'apple';

type AuthAttemptErrorPayload = {
  error?: string;
  retryAfterSeconds?: number;
};

const providerIds = new Set<ProviderId>(['google', 'apple']);

const makeAuthAttemptError = (code: string, message: string, retryAfterSeconds?: number) => {
  const error = new Error(message) as Error & { code: string; retryAfterSeconds?: number };
  error.code = code;
  error.retryAfterSeconds = retryAfterSeconds;
  return error;
};

export async function reserveAuthAttempt(provider: ProviderId) {
  const normalizedProvider = provider.trim().toLowerCase().slice(0, 20) as ProviderId;

  if (!providerIds.has(normalizedProvider)) {
    throw makeAuthAttemptError('auth/invalid-provider', 'Invalid sign-in provider.');
  }

  if (!import.meta.env.PROD) {
    return;
  }

  let response: Response;
  try {
    response = await fetch('/api/auth/attempt', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider: normalizedProvider,
      }),
    });
  } catch {
    throw makeAuthAttemptError(
      'auth/attempt-check-failed',
      'Sign-in protection could not be verified. Try again in a moment.'
    );
  }

  if (response.ok) {
    return;
  }

  let payload: AuthAttemptErrorPayload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (response.status === 429 || payload.error === 'too_many_auth_attempts') {
    throw makeAuthAttemptError(
      'auth/too-many-requests',
      'Too many sign-in attempts from this network. Wait a few minutes and try again.',
      payload.retryAfterSeconds
    );
  }

  throw makeAuthAttemptError(
    'auth/attempt-check-failed',
    'Sign-in protection could not be verified. Try again in a moment.'
  );
}
