import { useState, useEffect } from 'react';
import { getPasswordStrength } from '@/utils/passwordStrength';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Eye, EyeOff, Loader2, ArrowLeft, CheckCircle,
  Zap, Sparkles, Mic, BarChart3, ShieldCheck, Mail, AlertCircle,
} from 'lucide-react';
import authLogo from '@/assets/Auth logo.png';

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Zap,       title: 'Signal Scout',       desc: 'Real-time trend detection across sneaker culture and media.' },
  { icon: Sparkles,  title: 'AI Content Engine',  desc: 'Generate on-brand content in your editorial voice, instantly.' },
  { icon: Mic,       title: 'Voice Profiles',      desc: 'Train the AI to match your tone, style, and editorial DNA.' },
  { icon: BarChart3, title: 'Content Pipeline',    desc: 'From signal to published — tracked and managed in one hub.' },
];

// Views that should NOT trigger an auto-redirect even if user is signed in
const STAY_VIEWS = ['email-confirmed', 'set-password', 'set-password-done', 'verify-otp'] as const;

type View =
  | 'signin'
  | 'signup'
  | 'verify-otp'
  | 'forgot'
  | 'forgot-sent'
  | 'set-password'
  | 'set-password-done'
  | 'email-confirmed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const getStrength = getPasswordStrength;

// ─── PasswordField ────────────────────────────────────────────────────────────

interface PasswordFieldProps {
  id: string;
  label?: string;
  value: string;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}

const PasswordField = ({ id, label, value, placeholder, show, onToggle, onChange, error, required }: PasswordFieldProps) => (
  <div className="space-y-1">
    {label && <Label htmlFor={id} className="text-sm font-medium text-foreground/80">{label}</Label>}
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`h-10 pr-10 bg-muted/40 border-border/50 focus:bg-background transition-colors ${
          error ? 'border-red-400 focus-visible:ring-red-300' : ''
        }`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);

// ─── ErrorBanner ──────────────────────────────────────────────────────────────

const ErrorBanner = ({ message }: { message: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
    <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-red-700 leading-snug">Something went wrong</p>
      <p className="text-xs text-red-500/90 mt-0.5 leading-relaxed">{message}</p>
    </div>
  </div>
);

// ─── Dot grid for left panel ──────────────────────────────────────────────────

const DOT_GRID = `url("data:image/svg+xml,%3Csvg width='22' height='22' viewBox='0 0 22 22' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='white' fill-opacity='0.10'/%3E%3C/svg%3E")`;

// ─── Component ────────────────────────────────────────────────────────────────

const Auth = () => {
  const [view, setView] = useState<View>('signin');

  // Form fields
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName]         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmNew, setConfirmNew]           = useState('');

  // UI state
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState('');
  const [showPassword, setShowPassword]         = useState(false);
  const [showConfirmPw, setShowConfirmPw]       = useState(false);
  const [showNewPw, setShowNewPw]               = useState(false);
  const [showConfirmNew, setShowConfirmNew]     = useState(false);

  // Resend state (signup-pending view)
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]       = useState(false);

  // OTP state
  const [otpCode, setOtpCode]         = useState('');
  const [otpLoading, setOtpLoading]   = useState(false);
  const [otpError, setOtpError]       = useState('');

  // Failed attempts + cooldown
  const [failedAttempts, setFailedAttempts]   = useState(0);
  const [cooldownUntil, setCooldownUntil]     = useState<number | null>(null);
  const [cooldownLeft, setCooldownLeft]       = useState(0);

  // Email rate limiting (resend + forgot)
  const [lastEmailSent, setLastEmailSent]     = useState<number | null>(null);
  const EMAIL_RATE_LIMIT_SECS = 60;

  // Validation
  const [emailError, setEmailError]   = useState('');
  const [confirmError, setConfirmError] = useState('');

  const { signIn, signUp, user } = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();

  // ── Effect 1: parse URL hash on mount (email confirm / password reset links) ──
  useEffect(() => {
    const hash   = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type   = params.get('type');

    if (type === 'recovery') {
      setView('set-password');
      window.history.replaceState(null, '', window.location.pathname);
    } else if (type === 'signup') {
      setView('email-confirmed');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // ── Effect 2: listen for Supabase PASSWORD_RECOVERY event ────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('set-password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Effect 3: redirect when signed in (skip special views) ───────────────────
  useEffect(() => {
    if (user && !(STAY_VIEWS as readonly string[]).includes(view)) {
      navigate('/');
    }
  }, [user, view, navigate]);

  // ── Effect 4: auto-redirect after confirmation / password-done screens ────────
  useEffect(() => {
    if (view === 'set-password-done') {
      const t = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(t);
    }
  }, [view, navigate]);

  // ── Effect 5: cooldown countdown ticker ──────────────────────────────────────
  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const left = Math.ceil((cooldownUntil - Date.now()) / 1000);
      if (left <= 0) { setCooldownUntil(null); setCooldownLeft(0); setFailedAttempts(0); }
      else setCooldownLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // ── Effect 6: BroadcastChannel — signal original tab after OTP confirms ──────
  useEffect(() => {
    const channel = new BroadcastChannel('sole_auth');
    channel.onmessage = (e) => {
      if (e.data === 'confirmed') navigate('/');
    };
    return () => channel.close();
  }, [navigate]);

  // ── Helpers ───────────────────────────────────────────────────────────────────

  const reset = () => {
    setError(''); setEmailError(''); setConfirmError('');
    setPassword(''); setConfirmPassword('');
    setNewPassword(''); setConfirmNew('');
    setShowPassword(false); setShowConfirmPw(false);
    setShowNewPw(false); setShowConfirmNew(false);
    setOtpCode(''); setOtpError('');
  };

  const switchView = (v: View) => { reset(); setView(v); };
  const checkEmail   = (val: string) => setEmailError(val && !isValidEmail(val) ? 'Enter a valid email address' : '');
  const checkConfirm = (val: string) => setConfirmError(val && val !== password ? 'Passwords do not match' : '');
  const checkNewConfirm = (val: string) => setConfirmError(val && val !== newPassword ? 'Passwords do not match' : '');

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const doSignIn = async () => {
    if (cooldownUntil && Date.now() < cooldownUntil) return;
    setLoading(true); setError('');
    const { error } = await signIn(email, password);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= 5) {
          const until = Date.now() + 30_000;
          setCooldownUntil(until);
          setError('Too many failed attempts. Please wait 30 seconds before trying again.');
        } else {
          setError(`Incorrect username or password. ${5 - next} attempt${5 - next === 1 ? '' : 's'} remaining.`);
        }
      } else if (msg.includes('email not confirmed')) {
        setError('Please confirm your email before signing in.');
      } else if (msg.includes('too many requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else {
        setError(error.message);
      }
    } else {
      setFailedAttempts(0);
      setCooldownUntil(null);
      toast({ title: 'Welcome back!', description: 'Successfully signed in to Sole Central Station.' });
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); return; }
    await doSignIn();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim())          { setError('Display name is required'); return; }
    if (!isValidEmail(email))         { setEmailError('Enter a valid email address'); return; }
    if (password.length < 6)          { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword)  { setConfirmError('Passwords do not match'); return; }
    setLoading(true); setError('');

    const result = await signUp(email, password, displayName);
    if (result.error) {
      const msg = result.error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists')) {
        toast({ title: 'Account already exists', description: 'Switching you to sign in…', variant: 'destructive' });
        setTimeout(() => switchView('signin'), 2000);
      } else {
        setError(result.error.message);
      }
    } else {
      setOtpCode(''); setOtpError('');
      setView('verify-otp');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) { setOtpError('Enter the 6-digit code from your email.'); return; }
    setOtpLoading(true); setOtpError('');
    const { error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) {
      setOtpError(error.message.includes('expired') || error.message.includes('invalid')
        ? 'Invalid or expired code. Request a new one.'
        : error.message);
    } else {
      new BroadcastChannel('sole_auth').postMessage('confirmed');
      navigate('/');
    }
    setOtpLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) { setEmailError('Enter a valid email address'); return; }
    if (lastEmailSent && (Date.now() - lastEmailSent) < EMAIL_RATE_LIMIT_SECS * 1000) {
      const secs = Math.ceil((EMAIL_RATE_LIMIT_SECS * 1000 - (Date.now() - lastEmailSent)) / 1000);
      setError(`Please wait ${secs}s before requesting another reset email.`);
      return;
    }
    setLoading(true); setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else { setLastEmailSent(Date.now()); setView('forgot-sent'); }
  };

  const handleResend = async () => {
    if (lastEmailSent && (Date.now() - lastEmailSent) < EMAIL_RATE_LIMIT_SECS * 1000) {
      const secs = Math.ceil((EMAIL_RATE_LIMIT_SECS * 1000 - (Date.now() - lastEmailSent)) / 1000);
      setError(`Please wait ${secs}s before requesting another email.`);
      return;
    }
    setResendLoading(true);
    setResendSent(false);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResendLoading(false);
    if (error) { setError(error.message); return; }
    setLastEmailSent(Date.now());
    setResendSent(true);
    setTimeout(() => setResendSent(false), 5000);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6)     { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmNew) { setConfirmError('Passwords do not match'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('auth session missing') || msg.includes('session')) {
        setError('Your reset link has expired or is invalid. Please request a new one.');
      } else {
        setError(error.message);
      }
    } else {
      setView('set-password-done');
    }
  };

  // Derived
  const signupStrength  = getStrength(password);
  const newPwStrength   = getStrength(newPassword);

  // ── Full-screen single-view screens ───────────────────────────────────────────

  // ── Signup pending — shown on the ORIGINAL tab while user confirms email ──────
  // Supabase fires onAuthStateChange(SIGNED_IN) across all tabs via localStorage,
  // so the redirect guard above will auto-navigate to '/' the moment the user
  // clicks the confirmation link in any tab/window.
  if (view === 'verify-otp') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">

          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-40" />
            <div className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-sm">
              <Mail className="h-9 w-9 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Enter your code</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We sent a 6-digit verification code to<br />
              <span className="font-semibold text-foreground">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
            <div className="space-y-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                className={`w-full h-14 text-center text-3xl font-bold tracking-[0.4em] rounded-xl border-2 bg-muted/40 focus:outline-none focus:bg-background transition-colors ${
                  otpError ? 'border-red-400' : 'border-border/50 focus:border-primary'
                }`}
                autoFocus
              />
              {otpError && <p className="text-xs text-red-500 text-center">{otpError}</p>}
            </div>
            <Button
              type="submit"
              disabled={otpLoading || otpCode.length !== 6}
              className="w-full h-10 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold text-sm"
            >
              {otpLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying…</> : 'Verify & Sign In'}
            </Button>
          </form>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendSent}
              className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendSent ? '✓ Code resent' : resendLoading ? 'Sending…' : 'Resend code'}
            </button>
            <br />
            <button
              type="button"
              onClick={() => switchView('signup')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Wrong email? Go back
            </button>
          </div>

        </div>
      </div>
    );
  }

  if (view === 'email-confirmed') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-sm">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Confirmation successful!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your email has been verified.<br />
              Close this page and head back to the main page to sign in.
            </p>
          </div>

          <p className="text-xs text-muted-foreground/60">
            You can now close this tab and return to the original tab to sign in.
          </p>
        </div>
      </div>
    );
  }

  if (view === 'forgot-sent') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto shadow-sm">
            <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Check your inbox</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We sent a password reset link to<br />
              <span className="font-semibold text-foreground">{email}</span>.<br />
              Follow the link to set a new password.
            </p>
          </div>
          <p className="text-xs text-muted-foreground/60">
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => switchView('forgot')}
              className="text-primary hover:underline"
            >
              try again
            </button>
            .
          </p>
          <button
            onClick={() => switchView('signin')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (view === 'set-password-done') {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-30" />
            <div className="relative w-20 h-20 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center shadow-sm">
              <ShieldCheck className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Password updated!</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your password has been changed successfully.<br />
              Taking you to your dashboard…
            </p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={() => navigate('/')}
              className="bg-gradient-primary hover:shadow-glow transition-all duration-300 px-8"
            >
              Go to Dashboard
            </Button>
            <p className="text-xs text-muted-foreground/60">Redirecting automatically in 3 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Main split layout ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* ══ LEFT PANEL ══════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #160A04 0%, #2E1508 40%, #7A3810 75%, #C06020 100%)' }}
      >
        <div className="absolute inset-0" style={{ backgroundImage: DOT_GRID }} />
        <div
          className="absolute -bottom-40 -left-20 w-[28rem] h-[28rem] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(192,96,32,0.28) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -top-20 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(210,140,60,0.15) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img
            src={authLogo}
            alt="SOLE — Born for Us. Raised by the Culture"
            className="h-24 w-auto mix-blend-screen"
            style={{ filter: 'invert(1)' }}
          />
        </div>

        {/* Copy + features */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-3xl xl:text-[2.4rem] font-bold text-white leading-tight">
              Your AI-powered<br />content command<br />center.
            </h2>
            <p className="mt-3 text-white/55 text-[0.95rem] leading-relaxed">
              Capture signals, craft content, and publish<br />with the speed of culture.
            </p>
          </div>
          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Icon className="h-3.5 w-3.5 text-amber-300/90" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-semibold leading-snug">{title}</p>
                  <p className="text-white/45 text-xs leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/25 text-[0.7rem] tracking-[0.2em] uppercase">
          Born for Us. Raised by the Culture.
        </p>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-8 min-h-screen overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-6">
          <img src={authLogo} alt="SOLE" className="h-24 w-auto mx-auto" />
        </div>

        <div className="w-full max-w-[360px]">

          {/* ── SIGN IN ────────────────────────────────────────────────────── */}
          {view === 'signin' && (
            <div className="space-y-5">
              <div className="space-y-0.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Welcome back</h1>
                <p className="text-sm text-muted-foreground">Sign in to your Sole Central Station account.</p>
              </div>

              {error && <ErrorBanner message={error} />}

              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="si-email" className="text-sm font-medium text-foreground/80">Email</Label>
                  <Input
                    id="si-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); checkEmail(e.target.value); }}
                    onBlur={(e) => checkEmail(e.target.value)}
                    required
                    className={`h-10 bg-muted/40 border-border/50 focus:bg-background transition-colors ${emailError ? 'border-red-400' : ''}`}
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="si-pw" className="text-sm font-medium text-foreground/80">Password</Label>
                  <PasswordField
                    id="si-pw"
                    value={password}
                    placeholder="Your password"
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    onChange={setPassword}
                    required
                  />
                  <button type="button" onClick={() => switchView('forgot')} className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full h-10 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold text-sm" disabled={loading || !!cooldownUntil}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in…</> : cooldownUntil ? `Try again in ${cooldownLeft}s` : 'Sign In'}
                </Button>
              </form>

              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border/60" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-border/60" /></div>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button type="button" onClick={() => switchView('signup')} className="text-primary font-semibold hover:underline">Create one</button>
              </p>
            </div>
          )}

          {/* ── SIGN UP ────────────────────────────────────────────────────── */}
          {view === 'signup' && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Create an account</h1>
                <p className="text-sm text-muted-foreground">Join Sole Central Station and start creating.</p>
              </div>

              {error && <ErrorBanner message={error} />}

              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="su-name" className="text-sm font-medium text-foreground/80">
                    Display Name
                  </Label>
                  <Input
                    id="su-name"
                    type="text"
                    placeholder="How should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="h-10 bg-muted/40 border-border/50 focus:bg-background transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="su-email" className="text-sm font-medium text-foreground/80">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); checkEmail(e.target.value); }}
                    onBlur={(e) => checkEmail(e.target.value)}
                    required
                    className={`h-10 bg-muted/40 border-border/50 focus:bg-background transition-colors ${emailError ? 'border-red-400' : ''}`}
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>

                <div className="space-y-1">
                  <PasswordField
                    id="su-pw"
                    label="Password"
                    value={password}
                    placeholder="At least 6 characters"
                    show={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    onChange={(v) => { setPassword(v); if (confirmPassword) checkConfirm(confirmPassword); }}
                    required
                  />
                  {signupStrength && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${signupStrength.bar}`} style={{ width: `${signupStrength.pct}%` }} />
                      </div>
                      <p className={`text-xs shrink-0 ${signupStrength.text}`}>{signupStrength.label}</p>
                    </div>
                  )}
                </div>

                <PasswordField
                  id="su-confirm"
                  label="Confirm Password"
                  value={confirmPassword}
                  placeholder="Confirm your password"
                  show={showConfirmPw}
                  onToggle={() => setShowConfirmPw(!showConfirmPw)}
                  onChange={(v) => { setConfirmPassword(v); checkConfirm(v); }}
                  error={confirmError}
                  required
                />

                <Button type="submit" className="w-full h-10 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold text-sm" disabled={loading || !!confirmError}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating account…</> : 'Create Account'}
                </Button>
              </form>

              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-border/60" /><span className="text-xs text-muted-foreground">or</span><div className="flex-1 h-px bg-border/60" /></div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => switchView('signin')} className="text-primary font-semibold hover:underline">Sign in</button>
              </p>
            </div>
          )}

          {/* ── FORGOT PASSWORD ────────────────────────────────────────────── */}
          {view === 'forgot' && (
            <div className="space-y-5">
              <div>
                <button type="button" onClick={() => switchView('signin')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </button>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Reset password</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter your email and we'll send a reset link.</p>
              </div>

              {error && <ErrorBanner message={error} />}

              <form onSubmit={handleForgot} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="fp-email" className="text-sm font-medium text-foreground/80">Email</Label>
                  <Input
                    id="fp-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); checkEmail(e.target.value); }}
                    onBlur={(e) => checkEmail(e.target.value)}
                    required
                    className={`h-10 bg-muted/40 border-border/50 focus:bg-background transition-colors ${emailError ? 'border-red-400' : ''}`}
                  />
                  {emailError && <p className="text-xs text-red-500">{emailError}</p>}
                </div>
                <Button type="submit" className="w-full h-10 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold text-sm" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : 'Send Reset Link'}
                </Button>
              </form>
            </div>
          )}

          {/* ── SET NEW PASSWORD (after clicking reset link) ───────────────── */}
          {view === 'set-password' && (
            <div className="space-y-5">
              <div className="space-y-0.5">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Set new password</h1>
                <p className="text-sm text-muted-foreground">Choose a strong password for your account.</p>
              </div>

              {error && (
                <>
                  <ErrorBanner message={error} />
                  {error.includes('expired') && (
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="w-full text-sm text-primary hover:underline text-center"
                    >
                      Request a new reset link
                    </button>
                  )}
                </>
              )}

              <form onSubmit={handleSetPassword} className="space-y-3">
                <div className="space-y-1">
                  <PasswordField
                    id="sp-pw"
                    label="New Password"
                    value={newPassword}
                    placeholder="At least 6 characters"
                    show={showNewPw}
                    onToggle={() => setShowNewPw(!showNewPw)}
                    onChange={(v) => { setNewPassword(v); if (confirmNew) checkNewConfirm(confirmNew); }}
                    required
                  />
                  {newPwStrength && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${newPwStrength.bar}`} style={{ width: `${newPwStrength.pct}%` }} />
                      </div>
                      <p className={`text-xs shrink-0 ${newPwStrength.text}`}>{newPwStrength.label}</p>
                    </div>
                  )}
                </div>

                <PasswordField
                  id="sp-confirm"
                  label="Confirm New Password"
                  value={confirmNew}
                  placeholder="Confirm your new password"
                  show={showConfirmNew}
                  onToggle={() => setShowConfirmNew(!showConfirmNew)}
                  onChange={(v) => { setConfirmNew(v); checkNewConfirm(v); }}
                  error={confirmError}
                  required
                />

                <Button type="submit" className="w-full h-10 bg-gradient-primary hover:shadow-glow transition-all duration-300 font-semibold text-sm" disabled={loading || !!confirmError}>
                  {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating password…</> : 'Update Password'}
                </Button>
              </form>
            </div>
          )}

        </div>

        <p className="mt-8 text-xs text-muted-foreground/50 text-center">
          © {new Date().getFullYear()} Sole Central Station. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Auth;
