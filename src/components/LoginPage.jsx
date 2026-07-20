import { useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';

export default function LoginPage({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid work email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    setError('');
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 420));
    onSignIn(email.trim().toLowerCase());
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>queryflow</span></div>
        <div className="login-content">
          <p className="login-eyebrow">WELCOME BACK</p>
          <h1>Make every data question count.</h1>
          <p className="login-copy">Sign in to turn natural language into clear answers, charts, and decisions.</p>
          <div className="login-points"><p><CheckCircle2 size={16} /> Ask questions in plain English</p><p><CheckCircle2 size={16} /> Explore results in one conversation</p><p><CheckCircle2 size={16} /> Keep your analysis history close</p></div>
        </div>
        <p className="login-bottom">Built for teams that move with data.</p>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-heading"><h2>Sign in to Queryflow</h2><p>Use your workspace credentials to continue.</p></div>
          <form className="login-form" onSubmit={submit} noValidate>
            <label><span>Work email</span><div className="login-field"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@company.com" autoFocus /></div></label>
            <label><span>Password</span><div className="login-field"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter your password" /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            <div className="login-options"><label className="remember"><input type="checkbox" defaultChecked /> <span>Remember me</span></label><button type="button" className="forgot-password">Forgot password?</button></div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button>
          </form>
          <p className="login-notice">Demo mode uses a local browser session. Connect your FastAPI auth route before production.</p>
        </div>
      </section>
    </main>
  );
}
