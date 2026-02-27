import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="text-center space-y-6 max-w-sm">
        <div className="text-8xl">🗳️</div>
        <div>
          <h1 className="text-6xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
            404
          </h1>
          <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Pagina non trovata
          </h2>
          <p className="text-base" style={{ color: 'var(--text-muted)' }}>
            Il sondaggio che cerchi non esiste o è stato rimosso.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="block rounded-xl py-3.5 text-center font-bold text-white transition-all hover:scale-[1.02]"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            Torna alla homepage
          </Link>
          <Link
            href="/create"
            className="block rounded-xl py-3.5 text-center font-semibold transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            + Crea un nuovo sondaggio
          </Link>
        </div>
      </div>
    </main>
  );
}
