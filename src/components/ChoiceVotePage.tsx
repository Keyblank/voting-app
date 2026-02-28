'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import type { Poll, Item, Choice } from '@/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Props {
  poll: Poll;
  items: Item[];
  choices: Choice[];
  slug: string;
  voterId: string | null;
  voterName: string | null;
  selectedChoices: Record<string, string[]>; // item_id → choice_id[]
  votedCount: number;
  onVote: (itemId: string, choiceId: string, selected: boolean) => Promise<boolean>;
}

export default function ChoiceVotePage({
  poll,
  items,
  choices,
  slug,
  voterId,
  voterName,
  selectedChoices,
  votedCount,
  onVote,
}: Props) {
  // saveStatus: key = `${itemId}_${choiceId}`
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});

  const isMulti = poll.poll_type === 'multi_choice';
  const maxChoices = poll.max_choices ?? 1;

  const getSelected = (itemId: string): string[] => selectedChoices[itemId] ?? [];

  const handleToggle = async (itemId: string, choiceId: string) => {
    if (!voterId) return;

    const selected = getSelected(itemId);
    const isCurrentlySelected = selected.includes(choiceId);

    // Multi: se non selezionato e già al limite, ignora
    if (isMulti && !isCurrentlySelected && selected.length >= maxChoices) return;

    const key = `${itemId}_${choiceId}`;
    setSaveStatus((prev) => ({ ...prev, [key]: 'saving' }));

    const ok = await onVote(itemId, choiceId, !isCurrentlySelected);

    setSaveStatus((prev) => ({ ...prev, [key]: ok ? 'saved' : 'error' }));
    setTimeout(() => {
      setSaveStatus((prev) => {
        if (prev[key] === 'saved' || prev[key] === 'error') {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    }, 1500);
  };

  return (
    <main className="min-h-screen pb-24" style={{ backgroundColor: 'var(--background)' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 px-4 py-3 shadow-md" style={{ backgroundColor: 'var(--background)' }}>
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-3 mb-3">
            <Link href={`/poll/${slug}`} className="text-lg" style={{ color: 'var(--text-muted)' }}>←</Link>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate" style={{ color: 'var(--text)' }}>{poll.title}</h1>
              {voterName && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Stai votando come <strong>{voterName}</strong>
                </p>
              )}
            </div>
          </div>
          <ProgressBar votedCount={votedCount} totalCount={items.length} />
        </div>
      </div>

      {/* Banner completamento */}
      {votedCount === items.length && items.length > 0 && (
        <div className="mx-auto max-w-xl px-4 pt-4">
          <div
            className="rounded-xl px-5 py-4 text-center"
            style={{
              backgroundColor: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.35)',
            }}
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold" style={{ color: 'var(--success)' }}>
              Hai votato tutti i {items.length} {items.length === 1 ? 'elemento' : 'elementi'}!
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Puoi cambiare i voti in qualsiasi momento
            </p>
          </div>
        </div>
      )}

      {/* Item cards */}
      <div className="mx-auto max-w-xl px-4 pt-4 space-y-3">
        {items.map((item) => {
          const selected = getSelected(item.id);
          const isVoted = selected.length > 0;
          const atLimit = isMulti && selected.length >= maxChoices;

          return (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: 'var(--card)',
                border: `1px solid ${isVoted ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'border-color 0.2s',
              }}
            >
              {/* Item header */}
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {item.name}
                  </p>
                  {item.subtitle && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {item.subtitle}
                    </p>
                  )}
                </div>
                <div className="ml-3 shrink-0 flex items-center gap-2">
                  {isMulti && (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {selected.length}/{maxChoices}
                    </span>
                  )}
                  <span
                    className="text-sm font-bold"
                    style={{ color: isVoted ? 'var(--success)' : 'var(--text-muted)' }}
                  >
                    {isVoted ? '✓' : '○'}
                  </span>
                </div>
              </div>

              {/* Choices */}
              <div className="p-3 space-y-2">
                {choices.map((choice) => {
                  const isSelected = selected.includes(choice.id);
                  const isDisabled = !isSelected && atLimit;
                  const key = `${item.id}_${choice.id}`;
                  const status = saveStatus[key] ?? 'idle';

                  return (
                    <button
                      key={choice.id}
                      onClick={() => handleToggle(item.id, choice.id)}
                      disabled={isDisabled || status === 'saving'}
                      className="w-full flex items-center justify-between rounded-lg px-4 py-3 text-left transition-all"
                      style={{
                        backgroundColor: isSelected
                          ? 'rgba(99,102,241,0.18)'
                          : isDisabled
                          ? 'rgba(255,255,255,0.03)'
                          : 'var(--background)',
                        border: `1.5px solid ${
                          isSelected
                            ? 'var(--primary)'
                            : isDisabled
                            ? 'var(--border)'
                            : 'var(--border)'
                        }`,
                        opacity: isDisabled ? 0.45 : 1,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: isSelected ? 'var(--primary-light)' : isDisabled ? 'var(--text-muted)' : 'var(--text)' }}
                      >
                        {choice.name}
                      </span>
                      <span className="ml-3 shrink-0 text-sm">
                        {status === 'saving' && (
                          <span style={{ color: 'var(--text-muted)' }}>⋯</span>
                        )}
                        {status === 'saved' && (
                          <span style={{ color: 'var(--success)' }}>✓</span>
                        )}
                        {status === 'error' && (
                          <span style={{ color: 'var(--error, #ef4444)' }}>⚠</span>
                        )}
                        {status === 'idle' && isSelected && (
                          <span style={{ color: 'var(--primary)' }}>●</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed bottom button */}
      <div
        className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: `linear-gradient(to top, var(--background) 70%, transparent)` }}
      >
        <div className="mx-auto max-w-xl">
          <Link
            href={`/poll/${slug}/results`}
            className="block w-full rounded-xl py-4 text-center font-bold text-white transition-all hover:scale-[1.02] shadow-lg"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            📊 Vedi Risultati Live
          </Link>
        </div>
      </div>
    </main>
  );
}
