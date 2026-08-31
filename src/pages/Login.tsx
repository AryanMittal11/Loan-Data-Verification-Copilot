import { useNavigate } from 'react-router-dom';
import { useApp } from '@/appContext';
import type { Role } from '@/types';
import { Landmark, Upload, ListChecks, ShieldCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const roles: {
  id: Role;
  title: string;
  blurb: string;
  icon: typeof Upload;
  tasks: string[];
}[] = [
  {
    id: 'operator',
    title: 'Data Operator',
    blurb: 'Uploads loan tapes and watches import and validation health.',
    icon: Upload,
    tasks: ['Upload CSV loan tapes', 'Review parse summaries', 'Watch validation pass/fail'],
  },
  {
    id: 'reviewer',
    title: 'Reviewer',
    blurb: 'Works the exception queue, consults the AI assistant, makes decisions.',
    icon: ListChecks,
    tasks: ['Triage exceptions by severity', 'Consult AI suggestions', 'Approve, reject, or request correction'],
  },
  {
    id: 'consumer',
    title: 'Data Consumer',
    blurb: 'Browses verified records, checks data quality, exports, and audits.',
    icon: ShieldCheck,
    tasks: ['Browse verified records', 'Check data-quality score', 'Export and open audit trails'],
  },
];

export function Login() {
  const { setRole } = useApp();
  const nav = useNavigate();

  const pick = (r: Role) => {
    setRole(r);
    nav(`/${r}`);
  };

  return (
    <div className="min-h-screen bg-parchment flex flex-col">
      <div className="paper-grid flex-1 flex flex-col">
        <header className="px-6 lg:px-12 pt-10 pb-8 border-b border-warmink/12">
          <div className="flex items-center gap-3">
            <Landmark className="w-7 h-7 text-verified" strokeWidth={1.5} />
            <div>
              <h1 className="font-slab text-2xl font-semibold text-warmink leading-none">
                Loan Verification Copilot
              </h1>
              <p className="mt-1 text-xs text-warmink-mute">
                Intain Campus FinTech Challenge — Full Stack Track
              </p>
            </div>
          </div>
          <p className="mt-6 text-sm text-warmink-soft max-w-ledger leading-relaxed">
            Turn messy loan records into a validated, traceable, auditable dataset.
            Choose a role to enter the console. This is a demonstration with mock
            authentication — no credentials are required.
          </p>
        </header>

        <div className="px-6 lg:px-12 py-10">
          <h2 className="font-slab text-lg font-semibold text-warmink mb-1">
            Select your role
          </h2>
          <p className="text-xs text-warmink-mute mb-6">
            Each role opens a different area of the console.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-warmink/12 border border-warmink/12">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => pick(r.id)}
                className={cn(
                  'group text-left bg-parchment-lighter p-6 flex flex-col gap-4',
                  'hover:bg-parchment-light transition-colors',
                  'focus-visible:bg-parchment-light',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center justify-center w-10 h-10 border border-ink/20 bg-ink text-paper">
                    <r.icon className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <ArrowRight
                    className="w-4 h-4 text-warmink-mute group-hover:text-ink transition-colors"
                    strokeWidth={1.75}
                  />
                </div>
                <div>
                  <h3 className="font-slab text-lg font-semibold text-warmink">
                    {r.title}
                  </h3>
                  <p className="mt-1 text-sm text-warmink-soft leading-relaxed">
                    {r.blurb}
                  </p>
                </div>
                <ul className="mt-auto space-y-1.5">
                  {r.tasks.map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-2 text-xs text-warmink-mute"
                    >
                      <span className="mt-1.5 w-1 h-1 bg-warmink-mute shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
        </div>

        <footer className="mt-auto px-6 lg:px-12 py-5 border-t border-warmink/12 text-2xs text-warmink-mute flex flex-wrap gap-x-4 gap-y-1">
          <span>Mock data — 24 loan records, 10 exceptions, 13 verified</span>
          <span className="hidden sm:inline">·</span>
          <span>IBM Plex Slab / Sans / Mono</span>
          <span className="hidden sm:inline">·</span>
          <span>Hashed verified records with full audit trail</span>
        </footer>
      </div>
    </div>
  );
}
