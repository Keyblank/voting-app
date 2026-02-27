'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ItemDetail from './ItemDetail';
import type { ItemScore, Criterion } from '@/types';
import { useState } from 'react';

interface Props {
  scores: ItemScore[];
  criteria: Criterion[];
  maxScore: number;
}

const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ scores, criteria, maxScore }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {scores.map((score, index) => (
          <motion.div
            key={score.item.id}
            layoutId={`leaderboard-${score.item.id}`}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="rounded-xl overflow-hidden cursor-pointer transition-all hover:opacity-90"
              style={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
              }}
              onClick={() =>
                setExpandedId((prev) => (prev === score.item.id ? null : score.item.id))
              }
            >
              <div className="flex items-center gap-3 p-4">
                <span className="text-xl w-8 text-center shrink-0">
                  {index < 3 ? medals[index] : <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
                    {score.item.name}
                  </p>
                  {score.item.subtitle && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {score.item.subtitle}
                    </p>
                  )}
                  {/* Score bar */}
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full score-bar"
                      style={{
                        width: maxScore > 0 ? `${(score.totalAvg / maxScore) * 100}%` : '0%',
                        background: 'linear-gradient(to right, var(--primary), var(--primary-light))',
                      }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl font-bold" style={{ color: 'var(--primary-light)' }}>
                    {score.totalAvg.toFixed(1)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {score.totalVoteCount} vot.
                  </p>
                </div>
              </div>

              {/* Detail expansion */}
              <AnimatePresence>
                {expandedId === score.item.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <ItemDetail score={score} maxScore={maxScore} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {scores.length === 0 && (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--card)' }}>
          <p className="text-4xl mb-3">⏳</p>
          <p style={{ color: 'var(--text-muted)' }}>Nessun voto ancora. Sii il primo a votare!</p>
        </div>
      )}
    </div>
  );
}
