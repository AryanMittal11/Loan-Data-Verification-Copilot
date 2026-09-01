import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/appContext';
import type { Role } from '@/types';
import {
  Landmark,
  Upload,
  ListChecks,
  ShieldCheck,
  ArrowRight,
  UserCheck,
  Lock,
  Mail,
  User as UserIcon,
  Building,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface RoleConfig {
  id: Role;
  title: string;
  badge: string;
  blurb: string;
  icon: typeof Upload;
  demoEmail: string;
  demoName: string;
  demoOrg: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  highlights: string[];
}

const roleConfigs: Record<Role, RoleConfig> = {
  operator: {
    id: 'operator',
    title: 'Data Operator',
    badge: 'Ingestion & Pipeline',
    blurb: 'Uploads raw CSV tapes, manages file lineage, and monitors automated validation health.',
    icon: Upload,
    demoEmail: 'operator@example.com',
    demoName: 'Data Operator',
    demoOrg: 'Intain Ingestion Operations',
    accentBorder: 'border-pending',
    accentBg: 'bg-pending/10',
    accentText: 'text-pending-dark',
    highlights: [
      'Ingest multi-source loan tapes (loan_tape, servicer_update, document_manifest)',
      'Automated batch validation against 10 rule sets',
      'Row-level error diagnostics & lineage tracking',
    ],
  },
  reviewer: {
    id: 'reviewer',
    title: 'Reviewer / Underwriter',
    badge: 'Compliance & AI Review',
    blurb: 'Triages flagged exception queues, consults AI recommendations, and seals loan records.',
    icon: ListChecks,
    demoEmail: 'reviewer@example.com',
    demoName: 'Reviewer User',
    demoOrg: 'Credit Underwriting & Review',
    accentBorder: 'border-verified',
    accentBg: 'bg-verified/10',
    accentText: 'text-verified',
    highlights: [
      'Triage exceptions prioritized by severity (High/Medium/Low)',
      'Interactive AI Copilot for root-cause diagnosis & suggested fixes',
      'Human-in-the-loop approvals with SHA-256 digital stamp',
    ],
  },
  consumer: {
    id: 'consumer',
    title: 'Data Consumer / Investor',
    badge: 'Auditing & Secondary Market',
    blurb: 'Accesses verified and sealed assets, audits tamper-evident chains, and exports clean portfolios.',
    icon: ShieldCheck,
    demoEmail: 'consumer@example.com',
    demoName: 'Data Consumer',
    demoOrg: 'Capital Markets Analytics',
    accentBorder: 'border-ink/40',
    accentBg: 'bg-ink/5',
    accentText: 'text-ink',
    highlights: [
      'Inspect tamper-evident cryptographic verification certificates',
      'Immutable chronological audit timeline for every loan asset',
      'Export certified loan packages as structured CSV',
    ],
  },
};

export function Login() {
  const { login, register } = useApp();
  const nav = useNavigate();

  const [activeRole, setActiveRole] = useState<Role>('operator');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Sign in fields
  const [email, setEmail] = useState(roleConfigs.operator.demoEmail);
  const [password, setPassword] = useState('demo-password');
  
  // Sign up fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOrg, setRegOrg] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const activeConfig = roleConfigs[activeRole];

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    setError(null);
    setSuccessMsg(null);
    setEmail(roleConfigs[role].demoEmail);
    setPassword('demo-password');
  };

  const handleAutoFillSeeded = (role: Role) => {
    setActiveRole(role);
    setAuthMode('signin');
    setEmail(roleConfigs[role].demoEmail);
    setPassword('demo-password');
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both your registered email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await login({ email: email.trim(), password, role: activeRole });
      nav(`/${user.role}`);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !regEmail.trim() || !regPassword) {
      setError('Full name, work email, and password are required to register.');
      return;
    }
    if (regPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await register({
        name: name.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: activeRole,
        organization: regOrg.trim() || `${activeConfig.title} Dept`,
      });
      setSuccessMsg(`Account created successfully for ${user.name}! Directing to ${user.role.toUpperCase()} console...`);
      setTimeout(() => {
        nav(`/${user.role}`);
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-parchment flex flex-col font-sans">
      <div className="paper-grid flex-1 flex flex-col">
        {/* Top Header */}
        <header className="px-6 lg:px-12 pt-8 pb-6 border-b border-warmink/12 bg-parchment/80 backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="p-2 border border-ink/20 bg-ink text-paper inline-flex items-center justify-center shadow-sm">
                <Landmark className="w-6 h-6 text-verified-light" strokeWidth={1.75} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-slab text-xl md:text-2xl font-semibold text-warmink tracking-tight">
                    Loan Verification Copilot
                  </h1>
                </div>
                <p className="text-xs text-warmink-mute mt-0.5">
                  Secure Access Gateway
                </p>
              </div>
            </div>

            {/* Seeded Account Auto-Fill Helpers */}
            <div className="flex items-center gap-2 self-start md:self-auto bg-parchment-lighter p-1 border border-warmink/15 text-xs">
              <span className="px-2 text-2xs text-warmink-mute uppercase tracking-wider font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-600" /> Seeded Accounts:
              </span>
              {(['operator', 'reviewer', 'consumer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleAutoFillSeeded(r)}
                  className={cn(
                    'px-2.5 py-1 text-2xs uppercase font-medium tracking-wide transition-all',
                    activeRole === r && authMode === 'signin'
                      ? 'bg-ink text-paper shadow-xs'
                      : 'text-warmink-soft hover:text-warmink hover:bg-parchment',
                  )}
                >
                  {roleConfigs[r].title.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 px-6 lg:px-12 py-8 max-w-6xl w-full mx-auto flex flex-col justify-center">
          
          {/* Role Selection Cards */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-slab text-lg font-semibold text-warmink">
                  Select Target Role Portal
                </h2>
                <p className="text-xs text-warmink-mute">
                  Authentication requires a database-verified account matching the target role permissions.
                </p>
              </div>
              <span className="text-2xs font-mono text-warmink-soft border border-warmink/20 px-2 py-1 bg-parchment-lighter">
                Active Portal: <strong className="text-warmink uppercase">{activeConfig.title}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(roleConfigs) as Role[]).map((rKey) => {
                const conf = roleConfigs[rKey];
                const Icon = conf.icon;
                const isSelected = activeRole === rKey;
                return (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => handleRoleChange(rKey)}
                    className={cn(
                      'text-left p-4.5 border transition-all relative flex flex-col justify-between',
                      isSelected
                        ? 'bg-paper border-ink shadow-md ring-1 ring-ink'
                        : 'bg-parchment-lighter border-warmink/15 hover:border-warmink/35 hover:bg-parchment-light opacity-90',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span
                          className={cn(
                            'w-8 h-8 flex items-center justify-center border',
                            isSelected
                              ? 'bg-ink text-paper border-ink'
                              : 'bg-parchment text-warmink border-warmink/20',
                          )}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.75} />
                        </span>
                        <span
                          className={cn(
                            'text-3xs uppercase tracking-widest font-mono px-2 py-0.5 border',
                            conf.accentBorder,
                            conf.accentBg,
                            conf.accentText,
                          )}
                        >
                          {conf.badge}
                        </span>
                      </div>
                      <h3 className="font-slab text-base font-semibold text-warmink">
                        {conf.title}
                      </h3>
                      <p className="mt-1 text-xs text-warmink-soft leading-relaxed line-clamp-2">
                        {conf.blurb}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-warmink/10 flex items-center justify-between text-2xs text-warmink-mute">
                      <span>Seeded: <code className="font-mono text-warmink">{conf.demoEmail}</code></span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-verified" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Authentication Form Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-paper border border-warmink/20 shadow-sm p-6 md:p-8">
            
            {/* Form Column */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <div>
                {/* Mode Tabs */}
                <div className="flex items-center justify-between border-b border-warmink/15 pb-4 mb-6">
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setError(null);
                      }}
                      className={cn(
                        'font-slab text-base font-semibold transition-colors pb-1 border-b-2 -mb-[17px]',
                        authMode === 'signin'
                          ? 'border-ink text-warmink'
                          : 'border-transparent text-warmink-mute hover:text-warmink',
                      )}
                    >
                      Sign In ({activeConfig.title.split(' ')[0]})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setError(null);
                        setRegEmail('');
                        setRegPassword('');
                      }}
                      className={cn(
                        'font-slab text-base font-semibold transition-colors pb-1 border-b-2 -mb-[17px]',
                        authMode === 'signup'
                          ? 'border-ink text-warmink'
                          : 'border-transparent text-warmink-mute hover:text-warmink',
                      )}
                    >
                      Register New {activeConfig.title.split(' ')[0]}
                    </button>
                  </div>

                  <span className="text-2xs font-mono uppercase tracking-wider px-2 py-0.5 bg-parchment border border-warmink/15 text-warmink-mute">
                    Portal: {activeRole}
                  </span>
                </div>

                {/* Feedback Alerts */}
                {error && (
                  <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-800 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="mb-4 p-3 border border-verified/30 bg-verified/10 text-verified text-xs flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-verified shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* SIGN IN FORM */}
                {authMode === 'signin' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                        Registered Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={`e.g. ${activeConfig.demoEmail}`}
                          className="w-full pl-9 pr-3 py-2 bg-parchment-lightest border border-warmink/20 text-sm font-mono text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-2xs uppercase tracking-wider font-mono text-warmink-mute">
                          Password
                        </label>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full pl-9 pr-10 py-2 bg-parchment-lightest border border-warmink/20 text-sm font-mono text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-warmink-mute hover:text-warmink"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={cn(
                        'w-full py-2.5 px-4 bg-ink text-paper hover:bg-ink-light transition-colors',
                        'font-medium text-sm flex items-center justify-center gap-2 shadow-sm',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {loading ? (
                        'Verifying Credentials…'
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Sign In as {activeConfig.title}</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* SIGN UP / REGISTER FORM */
                  <form onSubmit={handleSignUp} className="space-y-3.5">
                    <div>
                      <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                        Full Legal Name
                      </label>
                      <div className="relative">
                        <UserIcon className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="w-full pl-9 pr-3 py-2 bg-parchment-lightest border border-warmink/20 text-sm text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                          Work Email
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="alex@company.com"
                            className="w-full pl-9 pr-3 py-2 bg-parchment-lightest border border-warmink/20 text-sm font-mono text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                          Organization / Dept
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={regOrg}
                            onChange={(e) => setRegOrg(e.target.value)}
                            placeholder="e.g. Compliance Dept"
                            className="w-full pl-9 pr-3 py-2 bg-parchment-lightest border border-warmink/20 text-sm text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs uppercase tracking-wider font-mono text-warmink-mute mb-1">
                        Password (min. 4 characters)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-warmink-mute absolute left-3 top-2.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create account password"
                          className="w-full pl-9 pr-10 py-2 bg-parchment-lightest border border-warmink/20 text-sm font-mono text-warmink placeholder:text-warmink-mute/50 focus:border-ink focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-warmink-mute hover:text-warmink"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 bg-parchment border border-warmink/12 text-2xs text-warmink-soft">
                      <span>Assigned Account Role: </span>
                      <strong className="text-warmink font-mono uppercase">{activeConfig.title}</strong>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={cn(
                        'w-full py-2.5 px-4 bg-ink text-paper hover:bg-ink-light transition-colors',
                        'font-medium text-sm flex items-center justify-center gap-2 shadow-sm',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      )}
                    >
                      {loading ? (
                        'Creating Account…'
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Register & Open {activeConfig.title} Console</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Scope Column */}
            <div className="lg:col-span-5 bg-parchment-lighter p-5 border border-warmink/15 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn('w-2.5 h-2.5 rounded-full', activeRole === 'operator' ? 'bg-amber-500' : activeRole === 'reviewer' ? 'bg-emerald-600' : 'bg-slate-800')} />
                  <h4 className="font-slab text-sm font-semibold text-warmink">
                    {activeConfig.title} Scope
                  </h4>
                </div>
                <p className="text-xs text-warmink-soft leading-relaxed mb-4">
                  {activeConfig.blurb}
                </p>

                <div className="space-y-2 mb-6">
                  <p className="text-3xs uppercase tracking-wider font-mono text-warmink-mute">
                    Authorized Capabilities:
                  </p>
                  <ul className="space-y-2">
                    {activeConfig.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-warmink-soft">
                        <span className="mt-1 w-1.5 h-1.5 bg-warmink-mute shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-warmink/15">
                <div className="flex items-center justify-between text-2xs text-warmink-mute mb-1.5">
                  <span>Seeded Account Credential</span>
                  <span className="font-mono text-warmink">{activeConfig.demoName}</span>
                </div>
                <div className="p-2.5 bg-paper border border-warmink/12 font-mono text-xs flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-warmink block truncate">{activeConfig.demoEmail}</span>
                    <span className="text-3xs text-warmink-mute block font-sans">Pass: demo-password</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFillSeeded(activeRole)}
                    className="text-2xs text-ink uppercase tracking-wider font-sans font-medium hover:underline shrink-0 ml-2"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="mt-auto px-6 lg:px-12 py-4 border-t border-warmink/12 text-2xs text-warmink-mute flex flex-wrap items-center justify-between gap-2 bg-parchment">
          <span>Loan Data Verification Copilot</span>
          <span>SHA-256 Tamper Evident Verification Ledger</span>
        </footer>
      </div>
    </div>
  );
}
