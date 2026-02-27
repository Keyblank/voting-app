'use client';
import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { supabase } from '@/lib/supabase-client';

const PREFIX = 'voteapp_';

export function useVoter(slug: string) {
  const [voterId, setVoterId] = useState<string | null>(null);
  const [voterName, setVoterName] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [needsNickname, setNeedsNickname] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem(`${PREFIX}${slug}_id`);
    const name = localStorage.getItem(`${PREFIX}${slug}_name`);
    const code = localStorage.getItem(`${PREFIX}${slug}_recovery`);
    if (id && name) {
      setVoterId(id);
      setVoterName(name);
      if (code) setRecoveryCode(code);
    } else {
      setNeedsNickname(true);
    }
    setIsLoading(false);
  }, [slug]);

  const register = async (name: string, pollId: string) => {
    const id = nanoid(16);
    const code = id.substring(0, 6).toUpperCase();

    localStorage.setItem(`${PREFIX}${slug}_id`, id);
    localStorage.setItem(`${PREFIX}${slug}_name`, name);
    localStorage.setItem(`${PREFIX}${slug}_recovery`, code);

    await supabase.from('voters').insert({ id, poll_id: pollId, name });

    setVoterId(id);
    setVoterName(name);
    setRecoveryCode(code);
    // needsNickname resta true — il parent lo gestisce con modalDismissed
  };

  const recoverByCode = async (
    code: string,
    pollId: string
  ): Promise<{ success: boolean; name?: string }> => {
    const sanitized = code.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toLowerCase();
    if (sanitized.length < 6) return { success: false };

    const { data, error } = await supabase
      .from('voters')
      .select('*')
      .eq('poll_id', pollId)
      .like('id', `${sanitized}%`)
      .limit(1)
      .maybeSingle();

    if (error || !data) return { success: false };

    const restoredCode = data.id.substring(0, 6).toUpperCase();
    localStorage.setItem(`${PREFIX}${slug}_id`, data.id);
    localStorage.setItem(`${PREFIX}${slug}_name`, data.name);
    localStorage.setItem(`${PREFIX}${slug}_recovery`, restoredCode);

    setVoterId(data.id);
    setVoterName(data.name);
    setRecoveryCode(restoredCode);
    setNeedsNickname(false);

    return { success: true, name: data.name };
  };

  return { voterId, voterName, recoveryCode, needsNickname, isLoading, register, recoverByCode };
}
