export interface PasswordStrength {
  label: string;
  bar: string;
  text: string;
  pct: number;
}

export function getPasswordStrength(pw: string): PasswordStrength | null {
  if (!pw) return null;
  if (pw.length < 6) return { label: 'Too short', bar: 'bg-red-500',   text: 'text-red-500',    pct: 18 };
  let score = 0;
  if (pw.length >= 8)          score++;
  if (pw.length >= 12)         score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak',   bar: 'bg-red-400',   text: 'text-red-500',    pct: 33 };
  if (score <= 3) return { label: 'Fair',   bar: 'bg-amber-400', text: 'text-amber-600',  pct: 66 };
  return              { label: 'Strong', bar: 'bg-green-500', text: 'text-green-600', pct: 100 };
}
