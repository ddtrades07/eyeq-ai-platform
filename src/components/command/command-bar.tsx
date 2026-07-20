'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays, ClipboardList, ImageIcon, LayoutDashboard,
  MessageSquare, Search, Settings, Sparkles, Stethoscope,
  Users, Brain, Bell, Boxes, LineChart, Mic,
  PlugZap, GraduationCap, UserPlus, CalendarPlus, FileText,
  ArrowRight, User, Loader2, X, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopilotStore } from '@/store/copilot';
import { useRecentPatients } from '@/store/recent-patients';
import { searchPatients } from '@/server/actions/patients';
import { searchGlobal, type GlobalSearchHit } from '@/server/actions/global-search';
import { useSelectedPatient } from '@/store/selected-patient';
import { hasAnyPermission, type Permission } from '@/lib/auth/rbac';
import type { Role } from '@prisma/client';

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  section: string;
  keywords: string[];
  permissions?: Permission[];
  action: () => void;
}

type PatientResult = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  email: string | null;
  phone: string | null;
};

const SECTIONS_ORDER = [
  'Patients',
  'Appointments',
  'Encounters',
  'Messages',
  'Optical',
  'Invoices',
  'Recent Patients',
  'Quick Actions',
  'Navigation',
  'Ask EyeQ',
];

const HIT_SECTION: Record<GlobalSearchHit['type'], string> = {
  patient: 'Patients',
  appointment: 'Appointments',
  encounter: 'Encounters',
  message: 'Messages',
  optical: 'Optical',
  invoice: 'Invoices',
};

const HIT_ICON: Record<GlobalSearchHit['type'], LucideIcon> = {
  patient: User,
  appointment: CalendarDays,
  encounter: ClipboardList,
  message: MessageSquare,
  optical: Boxes,
  invoice: LineChart,
};

export function CommandBar({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [globalHits, setGlobalHits] = useState<GlobalSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const openCopilot = useCopilotStore((s) => s.openWithPrompt);
  const setCopilotPatientId = useCopilotStore((s) => s.setPatientId);
  const setSelectedPatient = useSelectedPatient((s) => s.setSelectedPatient);
  const recentPatients = useRecentPatients((s) => s.patients);
  const pushRecent = useRecentPatients((s) => s.push);
  const [, startTransition] = useTransition();

  const selectPatient = useCallback(
    (id: string, name: string) => {
      setSelectedPatient(id, name);
      setCopilotPatientId(id);
      pushRecent(id, name);
      setOpen(false);
      startTransition(() => router.push(`/provider/patients/${id}`));
    },
    [router, pushRecent, setCopilotPatientId, setSelectedPatient],
  );

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      startTransition(() => router.push(href));
    },
    [router],
  );

  // Debounced global search (patients, appointments, encounters, messages, optical, invoices)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setPatientResults([]);
      setGlobalHits([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [patients, global] = await Promise.all([
          searchPatients({ query: q }),
          searchGlobal({ query: q }),
        ]);
        if (patients.ok) {
          setPatientResults(patients.data as PatientResult[]);
        } else {
          setPatientResults([]);
        }
        if (global.ok) {
          setGlobalHits(global.data);
        } else {
          setGlobalHits([]);
        }
      } catch {
        setPatientResults([]);
        setGlobalHits([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const staticItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      { id: 'new-appt', label: 'New appointment', icon: CalendarPlus, section: 'Quick Actions', keywords: ['create', 'schedule', 'book'], permissions: ['appointments:create'], action: () => go('/provider/appointments?action=new') },
      { id: 'new-patient', label: 'New patient', icon: UserPlus, section: 'Quick Actions', keywords: ['create', 'register', 'add'], permissions: ['patients:create'], action: () => go('/provider/patients?action=new') },
      { id: 'new-note', label: 'Pre-charting', icon: FileText, section: 'Quick Actions', keywords: ['soap', 'document', 'pretest'], permissions: ['notes:read'], action: () => go('/provider/pre-charting') },

      { id: 'nav-dash', label: 'Dashboard', icon: LayoutDashboard, section: 'Navigation', keywords: ['home', 'overview'], permissions: ['org:read'], action: () => go('/provider/dashboard') },
      { id: 'nav-appts', label: 'Schedule', icon: CalendarDays, section: 'Navigation', keywords: ['schedule', 'calendar'], permissions: ['appointments:read'], action: () => go('/provider/appointments') },
      { id: 'nav-patients', label: 'Patients', icon: Users, section: 'Navigation', keywords: ['roster', 'list', 'chart'], permissions: ['patients:read'], action: () => go('/provider/patients') },
      { id: 'nav-tasks', label: 'Tasks', icon: ClipboardList, section: 'Navigation', keywords: ['priority', 'queue'], permissions: ['org:read'], action: () => go('/provider/tasks') },
      { id: 'nav-imaging', label: 'Imaging', icon: ImageIcon, section: 'Navigation', keywords: ['fundus', 'oct', 'photos'], permissions: ['imaging:read'], action: () => go('/provider/imaging') },
      { id: 'nav-caregaps', label: 'Care gaps', icon: ClipboardList, section: 'Navigation', keywords: ['recalls', 'overdue', 'follow-up'], permissions: ['caregaps:read'], action: () => go('/provider/care-gaps') },
      { id: 'nav-messages', label: 'Messages', icon: MessageSquare, section: 'Navigation', keywords: ['inbox', 'chat'], permissions: ['messages:read'], action: () => go('/provider/messages') },
      { id: 'nav-prechart', label: 'Pre-charting', icon: Stethoscope, section: 'Navigation', keywords: ['pretest', 'intake'], permissions: ['notes:read'], action: () => go('/provider/pre-charting') },
      { id: 'nav-scribe', label: 'Ambient scribe', icon: Mic, section: 'Navigation', keywords: ['record', 'dictation'], permissions: ['scribe:use'], action: () => go('/provider/ambient-scribe') },
      { id: 'nav-timeline', label: 'Timeline Intelligence', icon: Brain, section: 'Navigation', keywords: ['intelligence', 'insights'], permissions: ['intelligence:read'], action: () => go('/provider/timeline-intelligence') },
      { id: 'nav-reminders', label: 'Reminders', icon: Bell, section: 'Navigation', keywords: ['sms', 'email', 'recall'], permissions: ['reminders:read'], action: () => go('/provider/reminders') },
      { id: 'nav-inventory', label: 'Inventory', icon: Boxes, section: 'Navigation', keywords: ['frames', 'lenses', 'stock'], permissions: ['inventory:read'], action: () => go('/provider/inventory') },
      { id: 'nav-billing', label: 'Billing', icon: LineChart, section: 'Navigation', keywords: ['invoice', 'balance'], permissions: ['billing:read'], action: () => go('/provider/billing') },
      { id: 'nav-reports', label: 'Reports', icon: LineChart, section: 'Navigation', keywords: ['revenue', 'financial'], permissions: ['finance:read'], action: () => go('/provider/financial-reports') },
      { id: 'nav-copilots', label: 'AI copilots', icon: Sparkles, section: 'Navigation', keywords: ['ask', 'ai'], permissions: ['scribe:use', 'notes:write'], action: () => go('/provider/copilots') },
      { id: 'nav-education', label: 'Patient education library', icon: GraduationCap, section: 'Navigation', keywords: ['learn', 'topics', 'handout'], permissions: ['org:read'], action: () => go('/provider/education-center') },
      { id: 'nav-setup', label: 'Practice settings', icon: Settings, section: 'Navigation', keywords: ['config', 'org'], permissions: ['org:manage'], action: () => go('/provider/practice-setup') },
      { id: 'nav-ehr', label: 'Integrations', icon: PlugZap, section: 'Navigation', keywords: ['fhir', 'hl7', 'ehr'], permissions: ['ehr:read'], action: () => go('/provider/ehr-integrations') },
      { id: 'nav-team', label: 'Team', icon: Users, section: 'Navigation', keywords: ['staff', 'invite'], permissions: ['users:manage'], action: () => go('/provider/team') },
      { id: 'nav-settings', label: 'Settings', icon: Settings, section: 'Navigation', keywords: ['preferences', 'account'], permissions: ['org:read'], action: () => go('/provider/settings') },

      { id: 'ai-summarize', label: 'Summarise this patient', icon: Sparkles, section: 'Ask EyeQ', keywords: ['summary', 'patient'], permissions: ['patients:read'], action: () => { setOpen(false); openCopilot('Summarise this patient\'s full clinical picture.'); } },
      { id: 'ai-highrisk', label: 'High-risk patients today', icon: Sparkles, section: 'Ask EyeQ', keywords: ['risk', 'flag', 'today'], permissions: ['intelligence:read'], action: () => { setOpen(false); openCopilot('Show me the high-risk patients on today\'s schedule and why.'); } },
      { id: 'ai-overdue', label: 'Who is overdue?', icon: Sparkles, section: 'Ask EyeQ', keywords: ['recall', 'overdue', 'follow'], permissions: ['caregaps:read'], action: () => { setOpen(false); openCopilot('List the patients who are most overdue for follow-up.'); } },
      { id: 'ai-soap', label: 'Draft SOAP note', icon: Sparkles, section: 'Ask EyeQ', keywords: ['note', 'draft', 'soap'], permissions: ['notes:write'], action: () => { setOpen(false); openCopilot('Generate a SOAP note draft for today\'s visit based on the patient context.'); } },
      { id: 'ai-today', label: 'What needs attention today?', icon: Sparkles, section: 'Ask EyeQ', keywords: ['attention', 'priority', 'today'], permissions: ['org:read'], action: () => { setOpen(false); openCopilot('What needs attention today?'); } },
    ];

    return items.filter(
      (item) =>
        !item.permissions ||
        item.permissions.length === 0 ||
        hasAnyPermission(role, item.permissions),
    );
  }, [go, openCopilot, role]);

  // Combine patient results + global hits + static items
  const allItems = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    const patientItems: CommandItem[] = patientResults.map((p) => ({
      id: `patient-${p.id}`,
      label: `${p.firstName} ${p.lastName}`,
      sublabel: [
        p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString() : null,
        p.phone,
        p.email,
      ]
        .filter(Boolean)
        .join(' · '),
      icon: User,
      section: 'Patients',
      keywords: [],
      action: () => selectPatient(p.id, `${p.firstName} ${p.lastName}`),
    }));

    const seen = new Set(patientItems.map((i) => i.id));
    const globalItems: CommandItem[] = globalHits
      .filter((h) => {
        const key = `${h.type}-${h.id}`;
        if (h.type === 'patient' && seen.has(`patient-${h.id}`)) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((h) => ({
        id: `${h.type}-${h.id}`,
        label: h.title,
        sublabel: h.subtitle,
        icon: HIT_ICON[h.type],
        section: HIT_SECTION[h.type],
        keywords: [],
        action: () => {
          if (h.type === 'patient') {
            selectPatient(h.id, h.title);
          } else {
            go(h.href);
          }
        },
      }));

    const recentItems: CommandItem[] = !q
      ? recentPatients.slice(0, 5).map((r) => ({
          id: `recent-${r.id}`,
          label: r.name,
          sublabel: 'Recently viewed',
          icon: User,
          section: 'Recent Patients',
          keywords: [],
          action: () => selectPatient(r.id, r.name),
        }))
      : [];

    const filteredStatic = q
      ? staticItems.filter(
          (i) =>
            i.label.toLowerCase().includes(q) ||
            i.sublabel?.toLowerCase().includes(q) ||
            i.keywords.some((k) => k.includes(q)),
        )
      : staticItems;

    return [...patientItems, ...globalItems, ...recentItems, ...filteredStatic];
  }, [patientResults, globalHits, recentPatients, staticItems, query, selectPatient, go]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of allItems) {
      const arr = map.get(item.section) ?? [];
      arr.push(item);
      map.set(item.section, arr);
    }
    return SECTIONS_ORDER
      .filter((s) => map.has(s))
      .map((s) => ({ section: s, items: map.get(s)! }));
  }, [allItems]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setPatientResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      allItems[activeIdx]?.action();
    }
  }

  if (!open) return null;

  let flatIdx = -1;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-x-0 top-[12%] z-[61] mx-auto w-full max-w-lg animate-in fade-in-0 slide-in-from-top-2 duration-200">
        <div className="overflow-hidden rounded-xl border bg-card shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search patients by name, phone, email, or date of birth…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
              spellCheck={false}
            />
            {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {query && (
              <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {grouped.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {searching ? 'Searching patients…' : `No results for "${query}"`}
              </div>
            ) : (
              grouped.map(({ section, items: sectionItems }) => (
                <div key={section} className="mb-1">
                  <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {section}
                    {section === 'Patients' && ` (${sectionItems.length})`}
                  </div>
                  {sectionItems.map((item) => {
                    flatIdx++;
                    const isActive = flatIdx === activeIdx;
                    const Icon = item.icon;
                    const idx = flatIdx;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-active={isActive}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary/10 text-foreground'
                            : 'text-foreground hover:bg-accent',
                        )}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIdx(idx)}
                      >
                        <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="flex-1 text-left">
                          <span className="font-medium">
                            {query.trim().length >= 2 && item.section === 'Patients'
                              ? highlightMatch(item.label, query)
                              : item.label}
                          </span>
                          {item.sublabel && (
                            <span className="ml-2 text-xs text-muted-foreground">{item.sublabel}</span>
                          )}
                        </span>
                        {isActive && <ArrowRight className="h-3.5 w-3.5 text-primary/60" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground">
            <span>
              <kbd className="rounded border bg-background px-1 py-0.5 text-[10px]">↑↓</kbd> navigate
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1 py-0.5 text-[10px]">↵</kbd> select
              <span className="mx-2">·</span>
              <kbd className="rounded border bg-background px-1 py-0.5 text-[10px]">esc</kbd> close
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> EyeQ AI
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function highlightMatch(text: string, query: string) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase().trim();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-100 px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
