'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoteSlider from './VoteSlider';
import type { Item, Criterion } from '@/types';

type SaveStatus = 'saving' | 'saved' | 'error' | null;

interface Props {
  item: Item;
  criteria: Criterion[];
  isVoted: boolean;
  getVoteValue: (itemId: string, criterionId: string) => number;
  onVote: (itemId: string, criterionId: string, value: number) => Promise<boolean>;
}

export default function VoteCard({ item, criteria, isVoted, getVoteValue, onVote }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Local values per criterion (criterionId -> value)
  const [localValues, setLocalValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      criteria.map((c) => [c.id, getVoteValue(item.id, c.id)])
    )
  );

  // Save status per criterion (criterionId -> SaveStatus)
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatus>>({});

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const statusTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Sync localValues when parent reloads existing votes (e.g. on re-entry)
  useEffect(() => {
    setLocalValues(
      Object.fromEntries(criteria.map((c) => [c.id, getVoteValue(item.id, c.id)]))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const handleValueChange = useCallback(
    (criterionId: string, value: number) => {
      setLocalValues((prev) => ({ ...prev, [criterionId]: value }));

      clearTimeout(saveTimers.current[criterionId]);
      clearTimeout(statusTimers.current[criterionId]);
      setSaveStatuses((prev) => ({ ...prev, [criterionId]: null }));

      saveTimers.current[criterionId] = setTimeout(async () => {
        setSaveStatuses((prev) => ({ ...prev, [criterionId]: 'saving' }));
        const success = await onVote(item.id, criterionId, value);
        setSaveStatuses((prev) => ({ ...prev, [criterionId]: success ? 'saved' : 'error' }));
        statusTimers.current[criterionId] = setTimeout(() => {
          setSaveStatuses((prev) => ({ ...prev, [criterionId]: null }));
        }, 1500);
      }, 300);
    },
    [item.id, onVote]
  );

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
      Object.values(statusTimers.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: 'var(--card)',
        border: `1px solid ${isVoted ? 'var(--success)' : 'var(--border)'}`,
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:opacity-90 transition-opacity"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--text)' }}>
            {item.name}
          </p>
          {item.subtitle && (
            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Punteggio parziale: media normalizzata dei criteri inclusi nel totale già votati */}
          {(() => {
            const includedCriteria = criteria.filter((c) => !c.exclude_from_total);
            const votedIncluded = includedCriteria.filter(
              (c) => localValues[c.id] !== undefined
            );
            if (votedIncluded.length === 0) return null;
            // Media delle percentuali normalizzate per il colore (funziona con range diversi)
            const normalizedSum = votedIncluded.reduce((sum, c) => {
              const range = c.max_value - c.min_value;
              return sum + (range > 0 ? (localValues[c.id] - c.min_value) / range : 0.5);
            }, 0);
            const hue = Math.round((normalizedSum / votedIncluded.length) * 120);
            // Media grezza per il numero mostrato
            const avg =
              votedIncluded.reduce((sum, c) => sum + localValues[c.id], 0) /
              votedIncluded.length;
            const roundedAvg = Math.round(avg * 10) / 10;
            return (
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: `hsl(${hue}, 65%, 55%)` }}
              >
                {roundedAvg}
              </span>
            );
          })()}
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: isVoted ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)',
              color: isVoted ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            {isVoted ? '✓ Votato' : '○ Non votato'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            {isExpanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {/* Vote controls */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-5 pt-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              {criteria.map((criterion) => (
                <VoteSlider
                  key={criterion.id}
                  criterionName={criterion.name}
                  criterionEmoji={criterion.emoji}
                  minValue={criterion.min_value}
                  maxValue={criterion.max_value}
                  currentValue={localValues[criterion.id] ?? criterion.min_value}
                  saveStatus={saveStatuses[criterion.id] ?? null}
                  onValueChange={(value) => handleValueChange(criterion.id, value)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
