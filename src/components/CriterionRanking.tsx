'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { Item, Vote, Criterion } from '@/types';

interface Props {
  criterion: Criterion;
  items: Item[];
  votes: Vote[];
}

const medals = ['🥇', '🥈', '🥉'];

export default function CriterionRanking({ criterion, items, votes }: Props) {
  const criterionVotes = votes.filter((v) => v.criterion_id === criterion.id);

  const scores = items
    .map((item) => {
      const itemVotes = criterionVotes.filter((v) => v.item_id === item.id);
      const avg =
        itemVotes.length > 0
          ? itemVotes.reduce((s, v) => s + v.value, 0) / itemVotes.length
          : 0;
      return { item, avg: Math.round(avg * 10) / 10, voteCount: itemVotes.length };
    })
    .sort((a, b) => b.avg - a.avg);

  const maxAvg = scores[0]?.avg || criterion.max_value;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {scores.map(({ item, avg, voteCount }, index) => (
          <motion.div
            key={item.id}
            layoutId={`criterion-${criterion.id}-${item.id}`}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <span className="text-lg w-7 text-center shrink-0">
              {index < 3 ? medals[index] : (
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>#{index + 1}</span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {item.name}
              </p>
              <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                <div
                  className="h-full rounded-full score-bar"
                  style={{
                    width: maxAvg > 0 ? `${(avg / maxAvg) * 100}%` : '0%',
                    backgroundColor: 'var(--secondary)',
                  }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold" style={{ color: 'var(--secondary)' }}>
                {avg.toFixed(1)}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {voteCount}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
