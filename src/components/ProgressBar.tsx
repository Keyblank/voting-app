'use client';

interface Props {
  votedCount: number;
  totalCount: number;
}

export default function ProgressBar({ votedCount, totalCount }: Props) {
  const pct = totalCount > 0 ? (votedCount / totalCount) * 100 : 0;

  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--card)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          Progresso votazione
        </span>
        <span className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
          {votedCount} / {totalCount}
        </span>
      </div>
      <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full rounded-full score-bar"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, var(--primary), var(--primary-light))`,
          }}
        />
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {votedCount === totalCount && totalCount > 0
          ? '✅ Hai votato tutti gli elementi!'
          : `Hai votato ${votedCount} su ${totalCount} elementi`}
      </p>
    </div>
  );
}
