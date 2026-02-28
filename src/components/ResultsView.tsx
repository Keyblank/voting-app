'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeVotes } from '@/hooks/useRealtimeVotes';
import Leaderboard from './Leaderboard';
import CriterionRanking from './CriterionRanking';
import ChoiceResultsView from './ChoiceResultsView';
import type { Poll, Criterion, Item, ItemScore, Vote } from '@/types';

interface Props {
  poll: Poll;
  criteria: Criterion[];
  items: Item[];
}

function calculateLeaderboard(
  votes: Vote[],
  items: Item[],
  criteria: Criterion[]
): ItemScore[] {
  const includedCriteria = criteria.filter((c) => !c.exclude_from_total);

  return items
    .map((item) => {
      const itemVotes = votes.filter((v) => v.item_id === item.id);

      const byCriterion = criteria.map((criterion) => {
        const criterionVotes = itemVotes.filter((v) => v.criterion_id === criterion.id);
        const avg =
          criterionVotes.length > 0
            ? criterionVotes.reduce((sum, v) => sum + v.value, 0) / criterionVotes.length
            : 0;
        return {
          criterion,
          avg: Math.round(avg * 10) / 10,
          voteCount: criterionVotes.length,
        };
      });

      // Solo i criteri che concorrono al totale
      const includedScores = byCriterion.filter((c) => !c.criterion.exclude_from_total);
      const totalAvg =
        includedScores.length > 0
          ? includedScores.reduce((sum, c) => sum + c.avg, 0) / includedScores.length
          : 0;

      return {
        item,
        totalAvg: Math.round(totalAvg * 10) / 10,
        byCriterion,
        totalVoteCount: new Set(itemVotes.map((v) => v.voter_id)).size,
      };
    })
    .sort((a, b) => b.totalAvg - a.totalAvg);
}


type TabType = 'general' | string;

export default function ResultsView({ poll, criteria, items }: Props) {
  const { votes, isLoading, isConnected, reconnect } = useRealtimeVotes(poll.id);

  // Delegare a ChoiceResultsView per sondaggi non-rating
  if (poll.poll_type === 'single_choice' || poll.poll_type === 'multi_choice') {
    return (
      <ChoiceResultsView
        poll={poll}
        items={items}
        votes={votes}
        isLoading={isLoading}
        isConnected={isConnected}
        reconnect={reconnect}
      />
    );
  }
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const leaderboard = useMemo(
    () => calculateLeaderboard(votes, items, criteria),
    [votes, items, criteria]
  );

  const maxScore = useMemo(
    () => (leaderboard.length > 0 ? leaderboard[0].totalAvg : 10),
    [leaderboard]
  );

  const uniqueVoters = useMemo(
    () => new Set(votes.map((v) => v.voter_id)).size,
    [votes]
  );

  const overallAvg = useMemo(() => {
    if (leaderboard.length === 0) return 0;
    const sum = leaderboard.reduce((s, item) => s + item.totalAvg, 0);
    return Math.round((sum / leaderboard.length) * 10) / 10;
  }, [leaderboard]);

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
            </div>
            {/* Live / Offline badge */}
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: isConnected
                  ? 'rgba(16,185,129,0.15)'
                  : 'rgba(245,158,11,0.15)',
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

          {/* Stats row */}
          <div className="mt-3 flex gap-3">
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{uniqueVoters}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>partecipanti</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{votes.length}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>voti</p>
            </div>
            <div className="flex-1 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: 'var(--card)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--primary-light)' }}>{overallAvg}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>media</p>
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

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto py-4">
          <button
            onClick={() => setActiveTab('general')}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all"
            style={{
              backgroundColor: activeTab === 'general' ? 'var(--primary)' : 'var(--card)',
              color: activeTab === 'general' ? '#fff' : 'var(--text-muted)',
            }}
          >
            Classifica generale
          </button>
          {criteria.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(c.id)}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5"
              style={{
                backgroundColor: activeTab === c.id
                  ? (c.exclude_from_total ? '#be185d' : 'var(--secondary)')
                  : 'var(--card)',
                color: activeTab === c.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {c.emoji && <span>{c.emoji}</span>}
              {c.name}
              {c.exclude_from_total && (
                <span className="text-xs opacity-75">★</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-10 w-10 animate-spin rounded-full border-4"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
            />
          </div>
        ) : activeTab === 'general' ? (
          <Leaderboard scores={leaderboard} criteria={criteria} maxScore={maxScore} />
        ) : (
          <CriterionRanking
            criterion={criteria.find((c) => c.id === activeTab)!}
            items={items}
            votes={votes}
          />
        )}
      </div>
    </div>
  );
}
