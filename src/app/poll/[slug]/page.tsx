import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase-server';
import { formatDate } from '@/lib/utils';
import ShareButton from '@/components/ShareButton';
import CloseButton from '@/components/CloseButton';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function PollPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!poll) notFound();

  const { count: voterCount } = await supabase
    .from('voters')
    .select('*', { count: 'exact', head: true })
    .eq('poll_id', poll.id);

  const { count: itemCount } = await supabase
    .from('items')
    .select('*', { count: 'exact', head: true })
    .eq('poll_id', poll.id);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center">
          {!poll.is_active && (
            <span className="mb-3 inline-block rounded-full px-3 py-1 text-sm font-medium"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              Votazioni chiuse
            </span>
          )}
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {poll.title}
          </h1>
          {poll.description && (
            <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
              {poll.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: 'var(--card)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Creato da</span>
            <span className="font-medium" style={{ color: 'var(--text)' }}>{poll.creator_name}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Data</span>
            <span style={{ color: 'var(--text)' }}>{formatDate(poll.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Partecipanti</span>
            <span style={{ color: 'var(--text)' }}>👥 {voterCount || 0}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Elementi</span>
            <span style={{ color: 'var(--text)' }}>🎯 {itemCount || 0}</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          {poll.is_active ? (
            <Link
              href={`/poll/${slug}/vote`}
              className="block w-full rounded-xl py-4 text-center text-lg font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              🗳️ Vota ora
            </Link>
          ) : (
            <div
              className="w-full rounded-xl py-4 text-center text-lg font-bold opacity-40 cursor-not-allowed"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              🗳️ Votazioni chiuse
            </div>
          )}

          <Link
            href={`/poll/${slug}/results`}
            className="block w-full rounded-xl py-4 text-center text-lg font-bold transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text)',
              border: '2px solid var(--border)',
            }}
          >
            📊 Vedi Risultati
          </Link>
        </div>

        {/* Share */}
        <ShareButton slug={slug} />

        {/* Close poll (only visible to creator) */}
        <CloseButton pollId={poll.id} slug={slug} isActive={poll.is_active} />

        {/* Back */}
        <div className="text-center">
          <Link href="/" className="text-sm transition-colors hover:underline"
            style={{ color: 'var(--text-muted)' }}>
            ← Torna alla homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
