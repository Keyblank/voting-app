'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';

interface Props {
  pollId: string;
  slug: string;
  isActive: boolean;
}

export default function CloseButton({ pollId, slug, isActive }: Props) {
  const [isCreator, setIsCreator] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const flag = localStorage.getItem(`voteapp_${slug}_creator`);
    setIsCreator(flag === 'true');
  }, [slug]);

  if (!isCreator || !isActive) return null;

  const handleClose = async () => {
    setIsClosing(true);
    const { error } = await supabase
      .from('polls')
      .update({ is_active: false })
      .eq('id', pollId);

    if (!error) {
      router.refresh();
    } else {
      setIsClosing(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div
        className="rounded-xl p-4 space-y-3"
        style={{
          backgroundColor: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.3)',
        }}
      >
        <p className="text-sm font-medium" style={{ color: '#f87171' }}>
          Chiudere le votazioni? Questa azione è irreversibile.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-all hover:scale-[1.01]"
            style={{ backgroundColor: 'var(--card-hover)', color: 'var(--text-muted)' }}
          >
            Annulla
          </button>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.01] disabled:opacity-60"
            style={{ backgroundColor: '#ef4444' }}
          >
            {isClosing ? 'Chiusura...' : 'Conferma'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: 'rgba(239,68,68,0.08)',
        color: '#f87171',
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      🔒 Chiudi votazioni
    </button>
  );
}
