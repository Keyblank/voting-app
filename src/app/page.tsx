import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import type { Poll } from '@/types';

async function getRecentPollsWithCounts(): Promise<{ poll: Poll; voterCount: number }[]> {
  try {
    const supabase = await createSupabaseServer();

    const { data: polls } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!polls || polls.length === 0) return [];

    const pollIds = polls.map((p) => p.id);

    const { data: voters } = await supabase
      .from('voters')
      .select('poll_id')
      .in('poll_id', pollIds);

    const voterCountMap = (voters || []).reduce<Record<string, number>>((acc, v) => {
      acc[v.poll_id] = (acc[v.poll_id] || 0) + 1;
      return acc;
    }, {});

    return polls.map((poll) => ({
      poll,
      voterCount: voterCountMap[poll.id] || 0,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const pollsWithCounts = await getRecentPollsWithCounts();

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium"
          style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)' }}
        >
          <span
            className="pulse-green inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: 'var(--success)' }}
          />
          Risultati in tempo reale
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl" style={{ color: 'var(--text)' }}>
          Vote<span style={{ color: 'var(--primary)' }}>Live</span>
        </h1>

        <p className="mb-8 max-w-md text-lg" style={{ color: 'var(--text-muted)' }}>
          Crea sondaggi personalizzati e vota in tempo reale con amici e colleghi
        </p>

        <Link
          href="/create"
          className="rounded-xl px-8 py-4 text-lg font-semibold text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          + Crea un Sondaggio
        </Link>
      </section>

      {/* Recent polls */}
      <section className="mx-auto max-w-2xl px-4 pb-16">
        <h2 className="mb-6 text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Sondaggi recenti
        </h2>

        {pollsWithCounts.length === 0 ? (
          <div
            className="rounded-xl p-8 text-center"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-muted)' }}
          >
            <p className="text-4xl mb-3">🗳️</p>
            <p>Nessun sondaggio ancora. Crea il primo!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pollsWithCounts.map(({ poll, voterCount }) => (
              <Link
                key={poll.id}
                href={`/poll/${poll.slug}`}
                className="block rounded-xl p-4 transition-all hover:scale-[1.01] hover:shadow-md"
                style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold" style={{ color: 'var(--text)' }}>
                      {poll.title}
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                      di {poll.creator_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!poll.is_active && (
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                      >
                        Chiuso
                      </span>
                    )}
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      👥 {voterCount}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(poll.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
