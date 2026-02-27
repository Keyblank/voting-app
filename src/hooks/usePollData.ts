'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { Poll, Criterion, Item } from '@/types';

export function usePollData(slug: string) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: pollData, error: pollError } = await supabase
          .from('polls')
          .select('*')
          .eq('slug', slug)
          .single();

        if (pollError || !pollData) {
          setError('Sondaggio non trovato');
          setIsLoading(false);
          return;
        }

        const [criteriaRes, itemsRes] = await Promise.all([
          supabase
            .from('criteria')
            .select('*')
            .eq('poll_id', pollData.id)
            .order('sort_order'),
          supabase
            .from('items')
            .select('*')
            .eq('poll_id', pollData.id)
            .order('sort_order'),
        ]);

        setPoll(pollData);
        setCriteria(criteriaRes.data || []);
        setItems(itemsRes.data || []);
      } catch {
        setError('Errore nel caricamento del sondaggio');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  return { poll, criteria, items, isLoading, error };
}
