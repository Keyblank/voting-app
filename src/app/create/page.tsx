import CreatePollForm from '@/components/CreatePollForm';

export default function CreatePage() {
  return (
    <main className="min-h-screen px-4 py-8" style={{ backgroundColor: 'var(--background)' }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Crea un Sondaggio
          </h1>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            Segui i passi per configurare il tuo sondaggio
          </p>
        </div>
        <CreatePollForm />
      </div>
    </main>
  );
}
