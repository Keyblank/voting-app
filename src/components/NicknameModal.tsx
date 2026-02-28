'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  pollTitle: string;
  pollId: string;
  onRegister: (name: string) => Promise<void>;
  onRecover: (code: string, pollId: string) => Promise<{ success: boolean; name?: string }>;
  recoveryCode: string | null;
  onClose: () => void;
}

type Screen = 'register' | 'show_code' | 'recover';

export default function NicknameModal({
  pollTitle,
  pollId,
  onRegister,
  onRecover,
  recoveryCode,
  onClose,
}: Props) {
  const [screen, setScreen] = useState<Screen>('register');
  const [name, setName] = useState('');
  const [recoverInput, setRecoverInput] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [recoverSuccess, setRecoverSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // After registration resolves, recoveryCode becomes non-null → switch to show_code
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    await onRegister(name.trim());
    setIsLoading(false);
    setScreen('show_code');
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoverError('');
    setRecoverSuccess('');
    if (recoverInput.replace(/[^a-zA-Z0-9]/g, '').length < 6) {
      setRecoverError('Il codice deve essere di 6 caratteri');
      return;
    }
    setIsLoading(true);
    const result = await onRecover(recoverInput, pollId);
    setIsLoading(false);
    if (result.success) {
      setRecoverSuccess(`Bentornato, ${result.name}!`);
      setTimeout(() => onClose(), 1200);
    } else {
      setRecoverError('Codice non trovato. Controlla e riprova.');
    }
  };

  const copyCode = async () => {
    if (!recoveryCode) return;
    try {
      await navigator.clipboard.writeText(recoveryCode);
    } catch {
      // fallback
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <AnimatePresence mode="wait">

        {/* REGISTER */}
        {screen === 'register' && (
          <motion.div
            key="register"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="mb-6 text-center">
              <div className="mb-3 text-4xl">🗳️</div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                Benvenuto!
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Scegli un nickname per votare in{' '}
                <strong style={{ color: 'var(--text)' }}>{pollTitle}</strong>
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <input
                type="text"
                placeholder="Il tuo nickname..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-center text-lg font-semibold outline-none transition-all"
                style={{
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)',
                  border: '2px solid var(--border)',
                }}
              />
              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {isLoading ? 'Caricamento...' : 'Inizia a votare →'}
              </button>
            </form>

            <button
              onClick={() => setScreen('recover')}
              className="mt-4 w-full text-center text-sm transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              Hai già votato da un altro dispositivo?{' '}
              <span style={{ color: 'var(--primary-light)' }}>Recupera il tuo codice</span>
            </button>
          </motion.div>
        )}

        {/* SHOW CODE after registration */}
        {screen === 'show_code' && (
          <motion.div
            key="show_code"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="mb-5 text-center">
              <div className="mb-3 text-4xl">🔑</div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                Il tuo codice personale
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Serve per continuare a votare da un altro dispositivo o browser.
              </p>
            </div>

            <button
              onClick={copyCode}
              className="mb-3 w-full rounded-xl py-4 text-center transition-all hover:scale-[1.02]"
              style={{
                backgroundColor: codeCopied ? 'rgba(16,185,129,0.15)' : 'var(--card-hover)',
                border: `2px solid ${codeCopied ? 'var(--success)' : 'var(--border)'}`,
              }}
            >
              <span
                className="block text-3xl font-mono font-bold tracking-widest"
                style={{ color: codeCopied ? 'var(--success)' : 'var(--primary-light)' }}
              >
                {recoveryCode || '------'}
              </span>
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                {codeCopied ? '✓ Copiato!' : 'Tocca per copiare'}
              </span>
            </button>

            {/* Warning prominente */}
            <div
              className="mb-4 rounded-xl px-4 py-3 text-sm text-center"
              style={{
                backgroundColor: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--warning)',
              }}
            >
              ⚠ Annotalo ora — non verrà mostrato di nuovo
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-all hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Ho salvato il codice, inizia! →
            </button>
          </motion.div>
        )}

        {/* RECOVER */}
        {screen === 'recover' && (
          <motion.div
            key="recover"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <button
              onClick={() => { setScreen('register'); setRecoverError(''); setRecoverSuccess(''); }}
              className="mb-4 flex items-center gap-1 text-sm transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
            >
              ← Torna indietro
            </button>

            <div className="mb-6 text-center">
              <div className="mb-3 text-4xl">🔑</div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
                Recupera il tuo account
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                Inserisci il codice a 6 caratteri che ti è stato assegnato
              </p>
            </div>

            <form onSubmit={handleRecover} className="space-y-3">
              <input
                type="text"
                placeholder="es. AB3X9K"
                value={recoverInput}
                onChange={(e) => {
                  setRecoverInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6));
                  setRecoverError('');
                }}
                maxLength={6}
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold tracking-widest outline-none transition-all"
                style={{
                  backgroundColor: 'var(--background)',
                  color: 'var(--text)',
                  border: `2px solid ${recoverError ? '#f87171' : recoverSuccess ? 'var(--success)' : 'var(--border)'}`,
                }}
              />

              {recoverError && (
                <p className="text-center text-sm" style={{ color: '#f87171' }}>
                  {recoverError}
                </p>
              )}
              {recoverSuccess && (
                <p className="text-center text-sm font-semibold" style={{ color: 'var(--success)' }}>
                  ✓ {recoverSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={recoverInput.length < 6 || isLoading || !!recoverSuccess}
                className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {isLoading ? 'Verifica...' : 'Recupera account →'}
              </button>
            </form>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
