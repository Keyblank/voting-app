'use client';

import { useState } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import type { Poll, Item } from '@/types';

interface Props {
  poll: Poll;
  items: Item[];
  slug: string;
  voterId: string | null;
  voterName: string | null;
  selectedItems: string[]; // item_id selezionati dal voter
  votedCount: number;
  onSelect: (itemId: string) => Promise<boolean>;
}

export default function ChoiceVotePage({
  poll,
  items,
  slug,
  voterName,
  selectedItems,
  votedCount,
  onSelect,
}: Props) {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const isMulti = poll.poll_type === 'multi_choice';
  const maxChoices = poll.max_choices ?? 1;
  const atLimit = isMulti && selectedItems.length >= maxChoices;

  const handleClick = async (itemId: string) => {
    if (savingId) return; // evita click multipli durante salvataggio

    const isSelected = selectedItems.includes(itemId);
    // Per multi_choice: se non selezionato e al limite, blocca
    if (isMulti && !isSelected && atLimit) return;

    setSavingId(itemId);
    setErrorId(null);

    const ok = await onSelect(itemId);

    setSavingId(null);
    if (!ok) setErrorId(itemId);
    else if (errorId === itemId) setErrorId(null);
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
            {isMulti && (
              <span
                className="shrink-0 text-sm font-semibold tabular-nums px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: atLimit ? 'rgba(99,102,241,0.2)' : 'var(--card)',
                  color: atLimit ? 'var(--primary-light)' : 'var(--text-muted)',
                }}
              >
                {selectedItems.length}/{maxChoices}
              </span>
            )}
          </div>
          <ProgressBar
            votedCount={isMulti ? selectedItems.length : (selectedItems.length > 0 ? 1 : 0)}
            totalCount={isMulti ? maxChoices : 1}
          />
        </div>
      </div>

      {/* Istruzione contestuale */}
      <div className="mx-auto max-w-xl px-4 pt-4">
        <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          {isMulti
            ? `Scegli fino a ${maxChoices} elementi`
            : 'Scegli un elemento'}
        </p>
      </div>

      {/* Banner completamento (solo multi) */}
      {isMulti && atLimit && (
        <div className="mx-auto max-w-xl px-4 pt-3">
          <div
            className="rounded-xl px-5 py-4 text-center"
            style={{
              backgroundColor: 'rgba(16,185,129,0.12)',
              border: '1px solid rgba(16,185,129,0.35)',
            }}
          >
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-bold" style={{ color: 'var(--success)' }}>
              Hai espresso tutte le {maxChoices} preferenze!
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Puoi cambiare le tue scelte in qualsiasi momento
            </p>
          </div>
        </div>
      )}

      {/* Item list */}
      <div className="mx-auto max-w-xl px-4 pt-3 space-y-2">
        {items.map((item) => {
          const isSelected = selectedItems.includes(item.id);
          const isSaving = savingId === item.id;
          const isError = errorId === item.id;
          const isDisabled = !isSelected && isMulti && atLimit;

          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              disabled={isDisabled || isSaving}
              className="w-full rounded-xl text-left transition-all"
              style={{
                backgroundColor: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--card)',
                border: `2px solid ${isSelected ? 'var(--primary)' : isError ? '#ef4444' : 'var(--border)'}`,
                opacity: isDisabled ? 0.45 : 1,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <div className="flex items-center gap-4 px-4 py-4">
                {/* Indicatore selezione */}
                <div
                  className="shrink-0 flex items-center justify-center rounded-full transition-all"
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: isSelected ? 'var(--primary)' : 'var(--background)',
                    border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  {isSaving ? (
                    <span className="text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>⋯</span>
                  ) : isSelected ? (
                    <span className="text-white text-sm">✓</span>
                  ) : null}
                </div>

                {/* Testo elemento */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-semibold truncate"
                    style={{ color: isSelected ? 'var(--primary-light)' : isDisabled ? 'var(--text-muted)' : 'var(--text)' }}
                  >
                    {item.name}
                  </p>
                  {item.subtitle && (
                    <p className="text-sm truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {item.subtitle}
                    </p>
                  )}
                </div>

                {/* Feedback errore */}
                {isError && (
                  <span className="shrink-0 text-sm" style={{ color: '#ef4444' }}>⚠</span>
                )}
              </div>
            </button>
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
