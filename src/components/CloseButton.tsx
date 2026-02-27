'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface Props {
  pollId: string;
  slug: string;
  isActive: boolean;
}

type Mode = 'idle' | 'confirm-close' | 'confirm-delete';

export default function CloseButton({ pollId, slug, isActive }: Props) {
  const [isCreator, setIsCreator] = useState(false);
  const [mode, setMode] = useState<Mode>('idle');
  const [isLoading, setIsLoading] = useState(false);
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
    // Elimina in cascata: votes → voters → items → criteria → poll
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

  return (
    <div className="flex flex-col gap-2">
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
