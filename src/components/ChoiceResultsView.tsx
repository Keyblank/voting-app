'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Poll, Item, Vote } from '@/types';

interface Props {
  poll: Poll;
  items: Item[];
  votes: Vote[];
  isLoading: boolean;
  isConnected: boolean;
  reconnect: () => void;
}

export default function ChoiceResultsView({
  poll,
  items,
  votes,
  isLoading,
  isConnected,
  reconnect,
}: Props) {
  const uniqueVoters = useMemo(
    () => new Set(votes.map((v) => v.voter_id)).size,
    [votes]
  );

  // Per ogni item: count voti diretti, ordinati per count desc
  const itemStats = useMemo(() => {
    return items
      .map((item) => {
        const count = votes.filter((v) => v.item_id === item.id).length;
        return { item, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [items, votes]);

  const maxCount = itemStats[0]?.count ?? 0;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-4 shadow-md" style={{ backgroundColor: 'var(--background)' }}>
        <div className="mx-auto max-w-xl">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="font-bold truncate" style={{ color: 'var(--text)' }}>
                {poll.title}
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {poll.poll_type === 'single_choice'
                  ? 'Scelta singola'
                  : `Scelta multipla (max ${poll.max_choices} preferenze)`}
              </p>
            </div>
            {/* Live / Offline badge */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: isConnected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                color: isConnected ? 'var(--success)' : 'var(--warning)',
              }}
            >
              <span
                className={isConnected ? 'pulse-green' : ''}
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: isConnected ? 'var(--success)' : 'var(--warning)',
                }}
              />
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{uniqueVoters}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>votanti</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{votes.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>preferenze</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold truncate" style={{ color: 'var(--primary-light)' }}>
                {itemStats[0]?.count > 0 ? itemStats[0].item.name.split(' ')[0] : '—'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>in testa</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-xl px-4 pb-8">
        {/* Disconnection banner */}
        <AnimatePresence>
          {!isConnected && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
              style={{
                backgroundColor: 'rgba(245,158,11,0.1)',
                border: '1px solid rgba(245,158,11,0.3)',
              }}
            >
              <span className="text-sm" style={{ color: 'var(--warning)' }}>
                ⚠ Connessione persa — dati non aggiornati
              </span>
              <button
                onClick={reconnect}
                className="ml-3 text-sm font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--warning)' }}
              >
                Riprova
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
          </div>
        ) : (
          <div className="pt-4 space-y-2">
            {itemStats.length === 0 && (
              <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--card)' }}>
                <p className="text-4xl mb-3">⏳</p>
                <p style={{ color: 'var(--text-muted)' }}>Nessun voto ancora. Sii il primo!</p>
              </div>
            )}
            {itemStats.map(({ item, count }, index) => {
              const pct = uniqueVoters > 0 ? Math.round((count / uniqueVoters) * 100) : 0;
              const isLeader = index === 0 && count > 0;

              return (
                <motion.div
                  key={item.id}
                  layout
                  layoutId={`choice-item-${item.id}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: `1px solid ${isLeader ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-lg w-7 text-center shrink-0">
                      {index < 3
                        ? medals[index]
                        : <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                      {item.subtitle && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: isLeader ? 'var(--primary-light)' : 'var(--text-muted)' }}>
                      {count} <span className="text-xs font-normal">({pct}%)</span>
                    </span>
                  </div>
                  {/* Barra */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        background: isLeader
                          ? 'linear-gradient(to right, var(--primary), var(--primary-light))'
                          : 'var(--secondary)',
                      }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
