'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { generateSlug } from '@/lib/utils';

interface Props {
  pollId: string;
  slug: string;
  isActive: boolean;
}

type Mode = 'idle' | 'confirm-close' | 'confirm-delete' | 'duplicate';

export default function CloseButton({ pollId, slug, isActive }: Props) {
  const [isCreator, setIsCreator] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [dupTitle, setDupTitle] = useState('');
  const [dupError, setDupError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const flag = localStorage.getItem(`voteapp_${slug}_creator`);
    setIsCreator(flag === 'true');
  }, [slug]);

  if (!isCreator) return null;

  const handleClose = async () => {
    setIsLoading(true);
    const { error } = await supabase
      .from('polls')
      .update({ is_active: false })
      .eq('id', pollId);

    if (!error) {
      router.refresh();
    } else {
      setIsLoading(false);
      setMode('idle');
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    await supabase.from('votes').delete().eq('poll_id', pollId);
    await supabase.from('voters').delete().eq('poll_id', pollId);
    await supabase.from('items').delete().eq('poll_id', pollId);
    await supabase.from('criteria').delete().eq('poll_id', pollId);
    const { error } = await supabase.from('polls').delete().eq('id', pollId);

    if (!error) {
      localStorage.removeItem(`voteapp_${slug}_creator`);
      router.push('/');
    } else {
      setIsLoading(false);
      setMode('idle');
    }
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = dupTitle.trim();
    if (!title) return;

    setIsLoading(true);
    setDupError('');

    // Legge sondaggio originale + criteri + item
    const [{ data: originalPoll }, { data: originalCriteria }, { data: originalItems }] =
      await Promise.all([
        supabase.from('polls').select('*').eq('id', pollId).single(),
        supabase.from('criteria').select('*').eq('poll_id', pollId).order('sort_order'),
        supabase.from('items').select('*').eq('poll_id', pollId).order('sort_order'),
      ]);

    if (!originalPoll) {
      setDupError('Errore nel leggere il sondaggio originale.');
      setIsLoading(false);
      return;
    }

    const newSlug = generateSlug(title);

    // Crea il nuovo sondaggio
    const { data: newPoll, error: pollError } = await supabase
      .from('polls')
      .insert({
        title,
        description: originalPoll.description,
        slug: newSlug,
        creator_name: originalPoll.creator_name,
        is_active: true,
        instructions: originalPoll.instructions,
      })
      .select()
      .single();

    if (pollError || !newPoll) {
      setDupError('Errore nella creazione del sondaggio.');
      setIsLoading(false);
      return;
    }

    // Copia criteri
    if (originalCriteria && originalCriteria.length > 0) {
      const { error: criteriaError } = await supabase.from('criteria').insert(
        originalCriteria.map((c) => ({
          poll_id: newPoll.id,
          name: c.name,
          min_value: c.min_value,
          max_value: c.max_value,
          sort_order: c.sort_order,
          emoji: c.emoji,
          exclude_from_total: c.exclude_from_total,
        }))
      );
      if (criteriaError) {
        setDupError('Errore nella copia dei criteri.');
        setIsLoading(false);
        return;
      }
    }

    // Copia item
    if (originalItems && originalItems.length > 0) {
      const { error: itemsError } = await supabase.from('items').insert(
        originalItems.map((item) => ({
          poll_id: newPoll.id,
          name: item.name,
          subtitle: item.subtitle,
          sort_order: item.sort_order,
        }))
      );
      if (itemsError) {
        setDupError('Errore nella copia degli elementi.');
        setIsLoading(false);
        return;
      }
    }

    // Segna il nuovo sondaggio come creato da questo utente
    localStorage.setItem(`voteapp_${newSlug}_creator`, 'true');
    router.push(`/poll/${newSlug}`);
  };

  if (mode === 'confirm-close') {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <p className="text-sm font-medium" style={{ color: '#f87171' }}>
          Chiudere le votazioni? Questa azione è irreversibile.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('idle')}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all hover:scale-[1.01]"
            style={{ backgroundColor: 'var(--card-hover)', color: 'var(--text-muted)' }}
          >
            Annulla
          </button>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: '#ef4444' }}
          >
            {isLoading ? 'Chiusura...' : 'Conferma'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'confirm-delete') {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <p className="text-sm font-medium" style={{ color: '#f87171' }}>
          Eliminare il sondaggio? Tutti i voti andranno persi. Questa azione è irreversibile.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('idle')}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all hover:scale-[1.01]"
            style={{ backgroundColor: 'var(--card-hover)', color: 'var(--text-muted)' }}
          >
            Annulla
          </button>
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: '#ef4444' }}
          >
            {isLoading ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'duplicate') {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ backgroundColor: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--primary-light)' }}>
          📋 Duplica sondaggio
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Copia tutti gli elementi e i criteri in un nuovo sondaggio. I voti non vengono copiati.
        </p>
        <form onSubmit={handleDuplicate} className="space-y-2">
          <input
            type="text"
            placeholder="Titolo del nuovo sondaggio..."
            value={dupTitle}
            onChange={(e) => { setDupTitle(e.target.value); setDupError(''); }}
            maxLength={80}
            autoFocus
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
            style={{
              backgroundColor: 'var(--background)',
              color: 'var(--text)',
              border: `1px solid ${dupError ? '#f87171' : 'var(--border)'}`,
            }}
          />
          {dupError && (
            <p className="text-xs" style={{ color: '#f87171' }}>{dupError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('idle'); setDupTitle(''); setDupError(''); }}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all hover:scale-[1.01]"
              style={{ backgroundColor: 'var(--card-hover)', color: 'var(--text-muted)' }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!dupTitle.trim() || isLoading}
              className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-40"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {isLoading ? 'Creazione...' : 'Duplica →'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setMode('duplicate')}
        className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
        style={{
          backgroundColor: 'rgba(99,102,241,0.08)',
          color: 'var(--primary-light)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        📋 Duplica sondaggio
      </button>
      {isActive && (
        <button
          onClick={() => setMode('confirm-close')}
          className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
          style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          🔒 Chiudi votazioni
        </button>
      )}
      <button
        onClick={() => setMode('confirm-delete')}
        className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
        style={{
          backgroundColor: 'rgba(239,68,68,0.04)',
          color: '#f87171',
          border: '1px solid rgba(239,68,68,0.15)',
        }}
      >
        🗑️ Elimina sondaggio
      </button>
    </div>
  );
}
