'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChecklistTemplate, ChecklistCompletion } from '@/types';

const DB_NAME = 'schoonmaster-offline';
const DB_VERSION = 1;
const STORE_NAME = 'checklist-queue';

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queueOfflineAction(action: {
  shiftId: string; templateId: string; isChecked: boolean; clientTimestamp: string;
}) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(action);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function flushOfflineQueue(supabase: ReturnType<typeof createClient>) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const all: { id: number; shiftId: string; templateId: string; isChecked: boolean; clientTimestamp: string }[] = [];
  
  await new Promise<void>((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => { all.push(...req.result); resolve(); };
    req.onerror = () => reject(req.error);
  });

  if (all.length === 0) return;

  // Sort by clientTimestamp for reconciliation (last write wins)
  all.sort((a, b) => a.clientTimestamp.localeCompare(b.clientTimestamp));

  for (const item of all) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) break;
    
    await supabase.from('checklist_completions').upsert({
      shift_id: item.shiftId,
      template_id: item.templateId,
      cleaner_id: user.id,
      is_checked: item.isChecked,
      checked_at: item.isChecked ? item.clientTimestamp : null,
      client_timestamp: item.clientTimestamp,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'shift_id,template_id,cleaner_id' });

    // Remove from queue
    const delTx = db.transaction(STORE_NAME, 'readwrite');
    delTx.objectStore(STORE_NAME).delete(item.id);
  }
}

interface ChecklistItemProps {
  template: ChecklistTemplate;
  completion: ChecklistCompletion | undefined;
  shiftId: string;
  isOnline: boolean;
  onToggle: (templateId: string, checked: boolean) => void;
}

function ChecklistItem({ template, completion, isOnline, onToggle }: ChecklistItemProps) {
  const [checked, setChecked] = useState(completion?.is_checked ?? false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    const next = !checked;
    setChecked(next);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 400);
    onToggle(template.id, next);
  };

  return (
    <div
      className={`checklist-item ${checked ? 'checked' : ''}`}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      id={`checklist-item-${template.id}`}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle(); } }}
    >
      <div
        className={`checklist-checkbox ${isAnimating ? 'checked' : ''}`}
        style={{ transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {checked && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="checklist-text" style={{ flex: 1, fontSize: 'var(--text-sm)', fontWeight: 500 }}>
        {template.task_text}
      </span>
      {!isOnline && <span title="Will sync when online" style={{ fontSize: '0.75rem', opacity: 0.6 }}>🔄</span>}
    </div>
  );
}

export default function ChecklistClient({
  shiftId,
  templates,
  initialCompletions,
  siteName,
  userId,
  tenantId,
}: {
  shiftId: string;
  templates: ChecklistTemplate[];
  initialCompletions: ChecklistCompletion[];
  siteName: string;
  userId: string;
  tenantId: string;
}) {
  const supabase = createClient();
  const [completions, setCompletions] = useState<Record<string, boolean>>(
    Object.fromEntries(initialCompletions.map(c => [c.template_id, c.is_checked]))
  );
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onOnline = async () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      await flushOfflineQueue(supabase);
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 2000);
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // On mount, flush any pending offline queue
    if (navigator.onLine) onOnline();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleToggle = useCallback((templateId: string, isChecked: boolean) => {
    setCompletions(prev => ({ ...prev, [templateId]: isChecked }));
    const clientTimestamp = new Date().toISOString();

    if (isOnline) {
      startTransition(async () => {
        await supabase.from('checklist_completions').upsert({
          shift_id: shiftId,
          template_id: templateId,
          cleaner_id: userId,
          tenant_id: tenantId,
          is_checked: isChecked,
          checked_at: isChecked ? clientTimestamp : null,
          client_timestamp: clientTimestamp,
        }, { onConflict: 'shift_id,template_id,cleaner_id' });
      });
    } else {
      // Queue for offline sync
      queueOfflineAction({ shiftId, templateId, isChecked, clientTimestamp });
    }
  }, [isOnline, shiftId, supabase, userId, tenantId]);

  const completedCount = Object.values(completions).filter(Boolean).length;
  const totalCount = templates.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div>
      {/* Offline banner */}
      {!isOnline && (
        <div className="offline-banner" style={{ marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
          🔌 You&apos;re offline — changes are saved locally and will sync when you reconnect
        </div>
      )}
      {syncStatus === 'syncing' && (
        <div className="offline-banner" style={{ background: 'rgba(20,201,184,0.1)', borderColor: 'rgba(20,201,184,0.3)', color: 'var(--teal-400)', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
          🔄 Syncing offline changes…
        </div>
      )}
      {syncStatus === 'synced' && (
        <div className="offline-banner" style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)', color: 'var(--accent-green)', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
          ✅ All changes synced
        </div>
      )}

      {/* Progress bar */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex-between" style={{ marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{siteName}</div>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {completedCount} of {totalCount} tasks completed
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'var(--text-2xl)',
            color: progress === 100 ? 'var(--accent-green)' : 'var(--teal-400)',
          }}>
            {Math.round(progress)}%
          </div>
        </div>
        <div style={{
          height: '8px', background: 'var(--surface-2)',
          borderRadius: 'var(--radius-full)', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: progress === 100
              ? 'linear-gradient(90deg, var(--accent-green), var(--teal-400))'
              : 'linear-gradient(90deg, var(--teal-500), var(--brand-400))',
            borderRadius: 'var(--radius-full)',
            transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
          }} />
        </div>
        {progress === 100 && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3)', color: 'var(--accent-green)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
            🎉 All tasks complete!
          </div>
        )}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {templates.map((template, i) => (
          <div key={template.id} className="stagger-item animate-slide-up" style={{ animationDelay: `${i * 40}ms` }}>
            <ChecklistItem
              template={template}
              completion={initialCompletions.find(c => c.template_id === template.id)}
              shiftId={shiftId}
              isOnline={isOnline}
              onToggle={handleToggle}
            />
          </div>
        ))}
      </div>

      {isPending && (
        <div style={{ position: 'fixed', bottom: '80px', right: '16px' }}>
          <div className="spinner" style={{ width: '1.25rem', height: '1.25rem' }} />
        </div>
      )}
    </div>
  );
}
