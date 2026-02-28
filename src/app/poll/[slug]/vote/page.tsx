'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-client';
import { useVoter } from '@/hooks/useVoter';
import NicknameModal from '@/components/NicknameModal';
import VoteCard from '@/components/VoteCard';
import ProgressBar from '@/components/ProgressBar';
import ChoiceVotePage from '@/components/ChoiceVotePage';
import type { Poll, Criterion, Item, Choice } from '@/types';

export default function VotePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [choices, setChoices] = useState<Choice[]>([]);
  // For rating: votes[itemId][criterionId] = value
  // For choice: votes[itemId][choiceId] = 1
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [modalDismissed, setModalDismissed] = useState(false);
  const [instructionsDismissed, setInstructionsDismissed] = useState(false);

  const {
    voterId,
    voterName,
    recoveryCode,
    needsNickname,
    isLoading: isLoadingVoter,
    register,
    recoverByCode,
  } = useVoter(slug);

  // Reset modal dismissal when slug changes
  useEffect(() => {
    setModalDismissed(false);
  }, [slug]);

  // Fetch poll data
  useEffect(() => {
    async function fetchData() {
      const { data: pollData } = await supabase
        .from('polls')
        .select('*')
        .eq('slug', slug)
        .single();

      if (!pollData) {
        setError('Sondaggio non trovato');
        setIsLoadingData(false);
        return;
      }

      const [criteriaRes, itemsRes, choicesRes] = await Promise.all([
        supabase.from('criteria').select('*').eq('poll_id', pollData.id).order('sort_order'),
        supabase.from('items').select('*').eq('poll_id', pollData.id).order('sort_order'),
        supabase.from('choices').select('*').eq('poll_id', pollData.id).order('sort_order'),
      ]);

      setPoll(pollData);
      setCriteria(criteriaRes.data || []);
      setItems(itemsRes.data || []);
      setChoices(choicesRes.data || []);
      setIsLoadingData(false);
    }
    fetchData();
  }, [slug]);

  // Load existing votes when voter is known
  useEffect(() => {
    if (!voterId || !poll) return;

    async function loadMyVotes() {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('poll_id', poll!.id)
        .eq('voter_id', voterId);

      if (data) {
        const voteMap: Record<string, Record<string, number>> = {};
        for (const v of data) {
          if (!voteMap[v.item_id]) voteMap[v.item_id] = {};
          if (poll!.poll_type === 'rating') {
            // Rating: key = criterion_id
            voteMap[v.item_id][v.criterion_id] = v.value;
          } else {
            // Choice: key = choice_id
            if (v.choice_id) {
              voteMap[v.item_id][v.choice_id] = v.value;
            }
          }
        }
        setVotes(voteMap);
      }
    }
    loadMyVotes();
  }, [voterId, poll]);

  const handleVote = useCallback(
    async (itemId: string, criterionId: string, value: number): Promise<boolean> => {
      if (!voterId || !voterName || !poll) return false;

      setVotes((prev) => ({
        ...prev,
        [itemId]: { ...(prev[itemId] || {}), [criterionId]: value },
      }));

      const { error } = await supabase.from('votes').upsert(
        {
          poll_id: poll.id,
          item_id: itemId,
          criterion_id: criterionId,
          voter_id: voterId,
          voter_name: voterName,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_id,criterion_id,voter_id' }
      );

      return !error;
    },
    [voterId, voterName, poll]
  );

  const handleChoiceVote = useCallback(
    async (itemId: string, choiceId: string, selected: boolean): Promise<boolean> => {
      if (!voterId || !voterName || !poll) return false;

      if (!selected) {
        // Deseleziona: rimuovi dalla mappa locale e cancella dal DB
        setVotes((prev) => {
          const itemVotes = { ...(prev[itemId] || {}) };
          delete itemVotes[choiceId];
          return { ...prev, [itemId]: itemVotes };
        });

        const { error } = await supabase
          .from('votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('item_id', itemId)
          .eq('choice_id', choiceId)
          .eq('voter_id', voterId);
        return !error;
      }

      // Seleziona: per single_choice cancella prima i voti precedenti su questo item
      if (poll.poll_type === 'single_choice') {
        setVotes((prev) => ({ ...prev, [itemId]: { [choiceId]: 1 } }));
        await supabase
          .from('votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('item_id', itemId)
          .eq('voter_id', voterId);
      } else {
        setVotes((prev) => ({
          ...prev,
          [itemId]: { ...(prev[itemId] || {}), [choiceId]: 1 },
        }));
      }

      const { error } = await supabase.from('votes').upsert(
        {
          poll_id: poll.id,
          item_id: itemId,
          criterion_id: '',
          choice_id: choiceId,
          voter_id: voterId,
          voter_name: voterName,
          value: 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'item_id,choice_id,voter_id' }
      );
      return !error;
    },
    [voterId, voterName, poll]
  );

  const getVoteValue = (itemId: string, criterionId: string): number => {
    const criterion = criteria.find((c) => c.id === criterionId);
    return votes[itemId]?.[criterionId] ?? criterion?.min_value ?? 1;
  };

  const isItemVoted = (itemId: string): boolean => {
    if (poll?.poll_type !== 'rating') {
      // Per choice: almeno una scelta fatta
      return votes[itemId] !== undefined && Object.keys(votes[itemId]).length > 0;
    }
    if (criteria.length === 0) return false;
    return criteria.every((c) => votes[itemId]?.[c.id] !== undefined);
  };

  // Per choice: mappa item_id → choice_id[]
  const selectedChoices = useMemo<Record<string, string[]>>(() => {
    if (poll?.poll_type === 'rating') return {};
    const map: Record<string, string[]> = {};
    for (const itemId of Object.keys(votes)) {
      map[itemId] = Object.keys(votes[itemId]);
    }
    return map;
  }, [votes, poll]);

  const votedCount = items.filter((item) => isItemVoted(item.id)).length;

  if (isLoadingData || isLoadingVoter) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 mx-auto"
            style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error || !poll) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">😕</p>
          <p style={{ color: 'var(--text)' }}>{error || 'Sondaggio non trovato'}</p>
          <Link href="/" className="mt-4 inline-block text-sm hover:underline" style={{ color: 'var(--primary)' }}>
            Torna alla homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!poll.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">🔒</p>
          <p className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Votazioni chiuse</p>
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>Questo sondaggio non accetta più voti</p>
          <Link
            href={`/poll/${slug}/results`}
            className="inline-block rounded-xl px-6 py-3 font-semibold text-white transition-all hover:scale-105"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            📊 Vedi Risultati
          </Link>
        </div>
      </div>
    );
  }

  // Schermata istruzioni (solo se ci sono istruzioni e il voter è registrato)
  const showInstructions =
    poll.instructions &&
    !needsNickname &&
    !instructionsDismissed;

  if (showInstructions) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12"
        style={{ backgroundColor: 'var(--background)' }}>
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-4xl mb-3">📋</p>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{poll.title}</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Istruzioni</p>
          </div>
          <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text)' }}>
              {poll.instructions}
            </p>
          </div>
          {criteria.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Criteri di valutazione
              </p>
              {criteria.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg px-4 py-2.5"
                  style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}>
                  <span className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    {c.emoji && <span>{c.emoji}</span>}
                    {c.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {c.exclude_from_total && (
                      <span className="text-xs rounded-full px-2 py-0.5"
                        style={{ backgroundColor: 'rgba(190,24,93,0.15)', color: '#f472b6' }}>
                        separata
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {c.min_value}–{c.max_value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setInstructionsDismissed(true)}
            className="w-full rounded-xl py-4 text-lg font-bold text-white transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            🗳️ Inizia a votare
          </button>
        </div>
      </div>
    );
  }

  // Sondaggi choice: delegare a ChoiceVotePage
  if (poll.poll_type === 'single_choice' || poll.poll_type === 'multi_choice') {
    return (
      <>
        {needsNickname && !modalDismissed && (
          <NicknameModal
            pollTitle={poll.title}
            pollId={poll.id}
            onRegister={(name) => register(name, poll.id)}
            onRecover={recoverByCode}
            recoveryCode={recoveryCode}
            onClose={() => setModalDismissed(true)}
          />
        )}
        <ChoiceVotePage
          poll={poll}
          items={items}
          choices={choices}
          slug={slug}
          voterId={voterId}
          voterName={voterName}
          selectedChoices={selectedChoices}
          votedCount={votedCount}
          onVote={handleChoiceVote}
        />
      </>
    );
  }

  return (
    <>
      {needsNickname && !modalDismissed && poll && (
        <NicknameModal
          pollTitle={poll.title}
          pollId={poll.id}
          onRegister={(name) => register(name, poll.id)}
          onRecover={recoverByCode}
          recoveryCode={recoveryCode}
          onClose={() => setModalDismissed(true)}
        />
      )}

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

        {/* Vote cards */}
        <div className="mx-auto max-w-xl px-4 pt-4 space-y-3">
          {items.map((item) => (
            <VoteCard
              key={item.id}
              item={item}
              criteria={criteria}
              isVoted={isItemVoted(item.id)}
              getVoteValue={getVoteValue}
              onVote={handleVote}
            />
          ))}
        </div>
      </main>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: `linear-gradient(to top, var(--background) 70%, transparent)` }}>
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
    </>
  );
}
