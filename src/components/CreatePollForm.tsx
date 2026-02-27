'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { generateSlug } from '@/lib/utils';

interface CriterionInput {
  name: string;
  minValue: number;
  maxValue: number;
}

interface ItemInput {
  name: string;
  subtitle: string;
}

const FORM_KEY = 'voteapp_create_form';

export default function CreatePollForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');

  // Step 2
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { name: '', minValue: 1, maxValue: 10 },
  ]);

  // Step 3
  const [items, setItems] = useState<ItemInput[]>([
    { name: '', subtitle: '' },
    { name: '', subtitle: '' },
  ]);

  // sessionStorage persistence
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(FORM_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        if (state.step) setStep(state.step);
        if (state.title) setTitle(state.title);
        if (state.description) setDescription(state.description);
        if (state.creatorName) setCreatorName(state.creatorName);
        if (state.criteria?.length) setCriteria(state.criteria);
        if (state.items?.length) setItems(state.items);
      }
    } catch { /* ignore */ }
    hasRestoredRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) return;
    sessionStorage.setItem(
      FORM_KEY,
      JSON.stringify({ step, title, description, creatorName, criteria, items })
    );
  }, [step, title, description, creatorName, criteria, items]);

  // --- Step 2 helpers ---
  const addCriterion = () =>
    setCriteria((prev) => [...prev, { name: '', minValue: 1, maxValue: 10 }]);
  const removeCriterion = (i: number) =>
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, field: keyof CriterionInput, value: string | number) =>
    setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  // --- Step 3 helpers ---
  const addItem = () => setItems((prev) => [...prev, { name: '', subtitle: '' }]);
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ItemInput, value: string) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  const moveItem = (i: number, dir: -1 | 1) => {
    const newItems = [...items];
    const j = i + dir;
    if (j < 0 || j >= newItems.length) return;
    [newItems[i], newItems[j]] = [newItems[j], newItems[i]];
    setItems(newItems);
  };

  // --- Validation ---
  const canGoNext1 = title.trim() && creatorName.trim();
  const canGoNext2 = criteria.every((c) => c.name.trim()) && criteria.length >= 1;
  const canGoNext3 =
    items.filter((item) => item.name.trim()).length >= 2 &&
    items.every((item) => item.name.trim());

  // --- Validation hints ---
  const hint1 = !canGoNext1
    ? !title.trim() && !creatorName.trim()
      ? 'Inserisci il titolo e il tuo nome per continuare'
      : !title.trim()
      ? 'Inserisci il titolo del sondaggio'
      : 'Inserisci il tuo nome'
    : '';
  const hint2 = !canGoNext2 ? 'Assegna un nome a tutti i criteri' : '';
  const hint3 = !canGoNext3
    ? items.filter((i) => i.name.trim()).length < 2
      ? 'Aggiungi almeno 2 elementi con un nome'
      : 'Completa il nome di tutti gli elementi'
    : '';

  // --- Submit ---
  async function handleSubmit() {
    setIsSubmitting(true);
    setError('');
    try {
      const slug = generateSlug(title);

      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          slug,
          creator_name: creatorName.trim(),
        })
        .select()
        .single();

      if (pollError || !poll) throw new Error(pollError?.message || 'Errore creazione sondaggio');

      await supabase.from('criteria').insert(
        criteria.map((c, i) => ({
          poll_id: poll.id,
          name: c.name.trim(),
          min_value: c.minValue,
          max_value: c.maxValue,
          sort_order: i,
        }))
      );

      await supabase.from('items').insert(
        items.map((item, i) => ({
          poll_id: poll.id,
          name: item.name.trim(),
          subtitle: item.subtitle.trim() || null,
          sort_order: i,
        }))
      );

      // Mark this browser as the creator
      localStorage.setItem(`voteapp_${slug}_creator`, 'true');
      sessionStorage.removeItem(FORM_KEY);

      router.push(`/poll/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all';
  const inputStyle = {
    backgroundColor: 'var(--background)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)' }}>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: s <= step ? 'var(--primary)' : 'var(--card-hover)',
                color: s <= step ? '#fff' : 'var(--text-muted)',
              }}
            >
              {s}
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${((step - 1) / 3) * 100}%`, backgroundColor: 'var(--primary)' }}
          />
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Step {step} di 4 —{' '}
          {['Informazioni', 'Criteri', 'Elementi', 'Conferma'][step - 1]}
        </div>
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Informazioni generali
          </h2>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Titolo *
            </label>
            <input
              type="text"
              placeholder="es. Sanremo 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Descrizione (opzionale)
            </label>
            <textarea
              placeholder="es. Votate i cantanti di Sanremo!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass + ' resize-none'}
              style={inputStyle}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Il tuo nome *
            </label>
            <input
              type="text"
              placeholder="es. Marco"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Criteri di valutazione
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Definisci i criteri con cui si valuteranno gli elementi
          </p>
          <div className="space-y-3">
            {criteria.map((c, i) => (
              <div
                key={i}
                className="rounded-xl p-4 space-y-3"
                style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="es. Canzone, Performance..."
                    value={c.name}
                    onChange={(e) => updateCriterion(i, 'name', e.target.value)}
                    className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  {criteria.length > 1 && (
                    <button
                      onClick={() => removeCriterion(i)}
                      className="rounded-lg p-2 transition-colors hover:bg-red-500/20 text-red-400"
                      title="Rimuovi criterio"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Min</label>
                    <input
                      type="number"
                      value={c.minValue}
                      min={0}
                      max={c.maxValue - 1}
                      onChange={(e) => updateCriterion(i, 'minValue', parseInt(e.target.value))}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs" style={{ color: 'var(--text-muted)' }}>Max</label>
                    <input
                      type="number"
                      value={c.maxValue}
                      min={c.minValue + 1}
                      max={100}
                      onChange={(e) => updateCriterion(i, 'maxValue', parseInt(e.target.value))}
                      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addCriterion}
            className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
            style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
          >
            + Aggiungi criterio
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Elementi da votare
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aggiungi gli elementi che verranno votati (minimo 2)
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl p-3"
                style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border)' }}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveItem(i, -1)}
                    disabled={i === 0}
                    className="text-xs disabled:opacity-30"
                    style={{ color: 'var(--text-muted)' }}
                  >▲</button>
                  <button
                    onClick={() => moveItem(i, 1)}
                    disabled={i === items.length - 1}
                    className="text-xs disabled:opacity-30"
                    style={{ color: 'var(--text-muted)' }}
                  >▼</button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    placeholder={`Nome elemento ${i + 1} *`}
                    value={item.name}
                    onChange={(e) => updateItem(i, 'name', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    placeholder="Sottotitolo (opzionale)"
                    value={item.subtitle}
                    onChange={(e) => updateItem(i, 'subtitle', e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                {items.length > 2 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-500/20 text-red-400"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
            style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
          >
            + Aggiungi elemento
          </button>
        </div>
      )}

      {/* Step 4 */}
      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Riepilogo
          </h2>

          <div className="rounded-xl p-4 space-y-1" style={{ backgroundColor: 'var(--card-hover)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{title}</p>
            {description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>}
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Creato da: {creatorName}</p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>
              CRITERI ({criteria.length})
            </h3>
            <div className="space-y-1">
              {criteria.map((c, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--card-hover)' }}>
                  <span style={{ color: 'var(--text)' }}>{c.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {c.minValue} – {c.maxValue}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>
              ELEMENTI ({items.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--card-hover)' }}>
                  <span className="text-xs w-5 text-center" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.name}</p>
                    {item.subtitle && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.subtitle}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-4 py-3 text-sm text-red-300"
              style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 space-y-2">
        {/* Validation hint */}
        {step === 1 && hint1 && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{hint1}</p>
        )}
        {step === 2 && hint2 && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{hint2}</p>
        )}
        {step === 3 && hint3 && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{hint3}</p>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 rounded-xl py-3 font-medium transition-all hover:scale-[1.02]"
              style={{ backgroundColor: 'var(--card-hover)', color: 'var(--text)' }}
            >
              ← Indietro
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={
                (step === 1 && !canGoNext1) ||
                (step === 2 && !canGoNext2) ||
                (step === 3 && !canGoNext3)
              }
              className="flex-1 rounded-xl py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Avanti →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-xl py-3 font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-60"
              style={{ backgroundColor: 'var(--success)' }}
            >
              {isSubmitting ? 'Creazione in corso...' : '🚀 Crea Sondaggio'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
