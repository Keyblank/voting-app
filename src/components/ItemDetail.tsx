'use client';

import type { ItemScore } from '@/types';

interface Props {
  score: ItemScore;
  maxScore: number;
}

export default function ItemDetail({ score, maxScore }: Props) {
  return (
    <div className="px-4 pb-4 pt-3 space-y-3">
      {score.byCriterion.map(({ criterion, avg, voteCount }) => (
        <div key={criterion.id}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              {criterion.name}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {voteCount} voti
              </span>
              <span className="font-bold" style={{ color: 'var(--text)' }}>
                {avg.toFixed(1)}
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full rounded-full score-bar"
              style={{
                width: maxScore > 0 ? `${(avg / maxScore) * 100}%` : '0%',
                backgroundColor: 'var(--secondary)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
