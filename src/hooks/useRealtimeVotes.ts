'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';
import type { Vote } from '@/types';

const POLL_INTERVAL_MS = 30_000;

export function useRealtimeVotes(pollId: string) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const isConnectedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from('votes')
      .select('*')
      .eq('poll_id', pollId);
    if (data) {
      setVotes(data);
      setIsLoading(false);
    }
  }, [pollId]);

  const reconnect = useCallback(() => {
    setIsLoading(true);
    setRetryTrigger((v) => v + 1);
  }, []);

  // Polling fallback: si attiva solo quando isConnected === false
  useEffect(() => {
    isConnectedRef.current = isConnected;

    if (!isConnected && !isLoading) {
      const schedule = () => {
        pollTimerRef.current = setTimeout(async () => {
          if (!isConnectedRef.current) {
            await fetchVotes();
            schedule();
          }
        }, POLL_INTERVAL_MS);
      };
      schedule();
    }

    return () => {
      clearTimeout(pollTimerRef.current);
    };
  }, [isConnected, isLoading, fetchVotes]);

  useEffect(() => {
    fetchVotes();

    const channel = supabase
      .channel(`votes-${pollId}-${retryTrigger}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setVotes((prev) => [...prev, payload.new as Vote]);
          } else if (payload.eventType === 'UPDATE') {
            setVotes((prev) =>
              prev.map((v) =>
                v.id === (payload.new as Vote).id ? (payload.new as Vote) : v
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setVotes((prev) =>
              prev.filter((v) => v.id !== (payload.old as Vote).id)
            );
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, fetchVotes, retryTrigger]);

  return { votes, isLoading, isConnected, reconnect };
}
