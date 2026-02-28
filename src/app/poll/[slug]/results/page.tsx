import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase-server';
import ResultsView from '@/components/ResultsView';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!poll) notFound();

  const [criteriaRes, itemsRes, choicesRes] = await Promise.all([
    supabase.from('criteria').select('*').eq('poll_id', poll.id).order('sort_order'),
    supabase.from('items').select('*').eq('poll_id', poll.id).order('sort_order'),
    supabase.from('choices').select('*').eq('poll_id', poll.id).order('sort_order'),
  ]);

  const criteria = criteriaRes.data || [];
  const items = itemsRes.data || [];
  const choices = choicesRes.data || [];

  return (
    <>
      <ResultsView poll={poll} criteria={criteria} items={items} choices={choices} />

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 p-4"
        style={{ background: `linear-gradient(to top, var(--background) 70%, transparent)` }}>
        <div className="mx-auto max-w-xl flex gap-3">
          {poll.is_active && (
            <Link
              href={`/poll/${slug}/vote`}
              className="flex-1 rounded-xl py-3.5 text-center font-bold text-white transition-all hover:scale-[1.02] shadow-lg"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              🗳️ Vai a votare
            </Link>
          )}
          <Link
            href={`/poll/${slug}`}
            className="rounded-xl px-4 py-3.5 font-medium transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--card)', color: 'var(--text-muted)' }}
          >
            ←
          </Link>
        </div>
      </div>
    </>
  );
}
