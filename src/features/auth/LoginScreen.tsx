import { ArrowLeft, Check, CircleCheck, Hash, Mail, Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OTP_LENGTH } from '@/config/app';
import { captchaConfig } from '@/config/env';
import { AuthFlowError, requestCode, verifyCode, type AuthErrorKind } from '@/data';
import { es } from '@/i18n/es';
import { isValidEmail, isValidOtp } from '@/lib/validation';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Spinner } from '@/ui/spinner';
import { CaptchaWidget } from './CaptchaWidget';

// Login passwordless: un solo espacio que primero pide el email y después el código.
// Sin registro, sin contraseña, sin nombre de app ni logo.

const RESEND_COOLDOWN_SECONDS = 60;

const ERROR_MESSAGES: Record<AuthErrorKind, string> = {
  rateLimited: es.auth.errors.rateLimited,
  offline: es.auth.errors.offline,
  unavailable: es.auth.errors.unavailable,
  emailFailed: es.auth.errors.emailFailed,
  captcha: es.auth.errors.captcha,
  wrongCode: es.auth.errors.wrongCode,
  generic: es.auth.errors.generic,
};

function messageFor(error: unknown): string {
  return error instanceof AuthFlowError ? ERROR_MESSAGES[error.kind] : es.auth.errors.generic;
}

export function LoginScreen() {
  const captcha = captchaConfig();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Cuenta regresiva para poder reenviar el código.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus();
  }, [step]);

  const emailValid = isValidEmail(email);
  const captchaReady = !captcha || captchaToken !== null;

  async function sendCode(isResend: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await requestCode(email.trim(), captchaToken ?? undefined);
      setStep('code');
      setCode('');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (isResend) setNotice(es.auth.codeResent);
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
      // Cada token de captcha sirve una sola vez.
      if (captcha) setCaptchaReset((value) => value + 1);
    }
  }

  async function handleEmailSubmit(event: FormEvent) {
    event.preventDefault();
    if (!emailValid) {
      setError(es.auth.errors.invalidEmail);
      return;
    }
    if (!captchaReady || busy) return;
    await sendCode(false);
  }

  async function handleCodeSubmit(event: FormEvent) {
    event.preventDefault();
    if (!isValidOtp(code, OTP_LENGTH)) {
      setError(es.auth.errors.invalidCode(OTP_LENGTH));
      return;
    }
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await verifyCode(email.trim(), code);
      // La sesión se detecta sola y la app navega al inicio.
    } catch (caught) {
      setError(messageFor(caught));
      setBusy(false);
    }
  }

  function changeEmail() {
    setStep('email');
    setCode('');
    setError(null);
    setNotice(null);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app px-4 pt-safe pb-safe">
      <div className="w-full max-w-[400px] rounded-md border border-line bg-panel px-6 py-8 sm:px-10">
        {step === 'email' ? (
          <form noValidate onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-email" className="text-body-sm text-muted">
                {es.auth.emailLabel}
              </label>
              <Input
                id="login-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                placeholder={es.auth.emailPlaceholder}
                icon={<Mail />}
                value={email}
                invalid={error !== null}
                aria-describedby={error ? 'login-error' : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError(null);
                }}
              />
              <p id="login-error" role="alert" className="min-h-4 text-caption text-danger">
                {error}
              </p>
            </div>
            {captcha ? (
              <CaptchaWidget
                provider={captcha.provider}
                siteKey={captcha.siteKey}
                onToken={setCaptchaToken}
                resetSignal={captchaReset}
              />
            ) : null}
            <Button type="submit" block disabled={!emailValid || !captchaReady || busy}>
              {busy ? <Spinner /> : <Send />}
              {busy ? es.auth.sending : es.auth.sendCode}
            </Button>
          </form>
        ) : (
          <form noValidate onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <p className="flex items-start gap-2 text-caption text-muted">
              <CircleCheck aria-hidden className="mt-px size-4 shrink-0 text-success" />
              <span className="break-all">{es.auth.codeSentTo(email.trim())}</span>
            </p>
            <div className="flex flex-col gap-2">
              <label htmlFor="login-code" className="text-body-sm text-muted">
                {es.auth.codeLabel}
              </label>
              <Input
                ref={codeInputRef}
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                placeholder={'0'.repeat(OTP_LENGTH)}
                icon={<Hash />}
                className="tracking-[0.4em]"
                value={code}
                invalid={error !== null}
                aria-describedby={error ? 'code-error' : undefined}
                onChange={(event) => {
                  // Se aceptan códigos pegados con espacios o guiones: solo quedan los dígitos.
                  setCode(event.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                  setError(null);
                }}
              />
              <p id="code-error" role="alert" className="min-h-4 text-caption text-danger">
                {error ?? notice}
              </p>
            </div>
            <Button type="submit" block disabled={code.length !== OTP_LENGTH || busy}>
              {busy ? <Spinner /> : <Check />}
              {busy ? es.auth.verifying : es.auth.verify}
            </Button>
            {captcha ? (
              <CaptchaWidget
                provider={captcha.provider}
                siteKey={captcha.siteKey}
                onToken={setCaptchaToken}
                resetSignal={captchaReset}
              />
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="link"
                size="sm"
                className="px-0"
                onClick={changeEmail}
                disabled={busy}
              >
                <ArrowLeft />
                {es.auth.changeEmail}
              </Button>
              <Button
                variant="link"
                size="sm"
                className="px-0"
                disabled={busy || cooldown > 0 || !captchaReady}
                onClick={() => void sendCode(true)}
              >
                {cooldown > 0 ? es.auth.resendIn(cooldown) : es.auth.resendCode}
              </Button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
