'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { generateSlug } from '@/lib/utils';

type PollType = 'rating' | 'single_choice' | 'multi_choice';

interface CriterionInput {
  name: string;
  minValue: number;
  maxValue: number;
  emoji: string;
  excludeFromTotal: boolean;
}

const EMOJI_OPTIONS = ['🎵','🎤','💃','🎨','❤️','⭐','🔥','👑','🎭','🏆','🎯','✨','🌟','💫','🎶','🥁','🎸','🎹','🎺','🎻','😍','🤩','👏','💪','🧠','👀','😮','🤔','💡','🎉'];

interface ItemInput {
  name: string;
  subtitle: string;
}

const FORM_KEY = 'voteapp_create_form';

const POLL_TYPE_OPTIONS: { value: PollType; label: string; icon: string; desc: string }[] = [
  { value: 'rating', label: 'Valutazione', icon: '⭐', desc: 'Ogni elemento viene valutato su criteri numerici (es. 1–10)' },
  { value: 'single_choice', label: 'Scelta singola', icon: '🔘', desc: 'Ogni votante sceglie 1 elemento dalla lista (es. elezioni)' },
  { value: 'multi_choice', label: 'Scelta multipla', icon: '☑️', desc: 'Ogni votante sceglie fino a N elementi dalla lista' },
];

export default function CreatePollForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pollType, setPollType] = useState<PollType>('rating');
  const [maxChoices, setMaxChoices] = useState(2);

  // Step 2 — solo per rating
  const [criteria, setCriteria] = useState<CriterionInput[]>([
    { name: '', minValue: 1, maxValue: 10, emoji: '', excludeFromTotal: false },
  ]);

  // Step elementi (step 2 per non-rating, step 3 per rating)
  const [items, setItems] = useState<ItemInput[]>([
    { name: '', subtitle: '' },
    { name: '', subtitle: '' },
  ]);

  // Numero totale di step in base al tipo
  const totalSteps = pollType === 'rating' ? 4 : 3;

  // Mappa step logico → step UI (per non-rating salta lo step 2 criteri)
  // Per rating: 1=info, 2=criteri, 3=elementi, 4=conferma
  // Per non-rating: 1=info, 2=elementi, 3=conferma
  const stepLabel = (s: number): string => {
    if (pollType === 'rating') {
      return ['Informazioni', 'Criteri', 'Elementi', 'Conferma'][s - 1] ?? '';
    }
    return ['Informazioni', 'Elementi', 'Conferma'][s - 1] ?? '';
  };

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
        if (state.instructions) setInstructions(state.instructions);
        if (state.pollType) setPollType(state.pollType);
        if (state.maxChoices) setMaxChoices(state.maxChoices);
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
      JSON.stringify({ step, title, description, creatorName, instructions, pollType, maxChoices, criteria, items })
    );
  }, [step, title, description, creatorName, instructions, pollType, maxChoices, criteria, items]);

  // --- Step 2 helpers (rating criteri) ---
  const addCriterion = () =>
    setCriteria((prev) => [...prev, { name: '', minValue: 1, maxValue: 10, emoji: '', excludeFromTotal: false }]);
  const removeCriterion = (i: number) =>
    setCriteria((prev) => prev.filter((_, idx) => idx !== i));
  const updateCriterion = (i: number, field: keyof CriterionInput, value: string | number | boolean) =>
    setCriteria((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  // --- Items helpers ---
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

  // --- Emoji picker ---
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<number | null>(null);

  // --- Paste list (items) ---
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const parsePasteText = (text: string): ItemInput[] => {
    return text
      .split('\n')
      .map((line) => {
        let s = line.replace(/^\s*\d+[\.\)]\s*/, '').trim();
        if (!s) return null;
        const sepMatch = s.match(/^(.+?)\s+[-–\.]\s+"?(.+?)"?\s*$/);
        if (sepMatch) {
          return { name: sepMatch[1].trim(), subtitle: sepMatch[2].trim() };
        }
        return { name: s.trim(), subtitle: '' };
      })
      .filter((item): item is ItemInput => item !== null && item.name.length > 0);
  };

  const parsedPreview = parsePasteText(pasteText);

  const confirmPaste = () => {
    if (parsedPreview.length === 0) return;
    const existing = items.filter((i) => i.name.trim());
    setItems([...existing, ...parsedPreview]);
    setPasteText('');
    setShowPaste(false);
  };

  // --- Validation ---
  const canGoNext1 = title.trim() && creatorName.trim();
  const canGoNext2rating = criteria.every((c) => c.name.trim()) && criteria.length >= 1;
  const canGoNextItems =
    items.filter((item) => item.name.trim()).length >= 2 &&
    items.every((item) => item.name.trim());

  // Determina cosa valida lo step corrente
  const canGoNext = (): boolean => {
    if (step === 1) return !!canGoNext1;
    if (pollType === 'rating') {
      if (step === 2) return canGoNext2rating;
      if (step === 3) return canGoNextItems;
    } else {
      if (step === 2) return canGoNextItems;
    }
    return true;
  };

  // --- Validation hints ---
  const getHint = (): string => {
    if (step === 1 && !canGoNext1) {
      if (!title.trim() && !creatorName.trim()) return 'Inserisci il titolo e il tuo nome per continuare';
      if (!title.trim()) return 'Inserisci il titolo del sondaggio';
      return 'Inserisci il tuo nome';
    }
    if (step === 2 && pollType === 'rating' && !canGoNext2rating) {
      return 'Assegna un nome a tutti i criteri';
    }
    const itemsStep = pollType === 'rating' ? 3 : 2;
    if (step === itemsStep && !canGoNextItems) {
      if (items.filter((i) => i.name.trim()).length < 2) return 'Aggiungi almeno 2 elementi con un nome';
      return 'Completa il nome di tutti gli elementi';
    }
    return '';
  };

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
          instructions: instructions.trim() || null,
          poll_type: pollType,
          max_choices: pollType === 'multi_choice' ? maxChoices : 1,
        })
        .select()
        .single();

      if (pollError || !poll) throw new Error(pollError?.message || 'Errore creazione sondaggio');

      if (pollType === 'rating') {
        await supabase.from('criteria').insert(
          criteria.map((c, i) => ({
            poll_id: poll.id,
            name: c.name.trim(),
            min_value: c.minValue,
            max_value: c.maxValue,
            sort_order: i,
            emoji: c.emoji || null,
            exclude_from_total: c.excludeFromTotal,
          }))
        );
      }

      await supabase.from('items').insert(
        items.map((item, i) => ({
          poll_id: poll.id,
          name: item.name.trim(),
          subtitle: item.subtitle.trim() || null,
          sort_order: i,
        }))
      );

      localStorage.setItem(`voteapp_${slug}_creator`, 'true');
      sessionStorage.removeItem(FORM_KEY);

      router.push(`/poll/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setIsSubmitting(false);
    }
  }

  const inputClass = 'w-full rounded-lg px-4 py-3 text-sm outline-none transition-all';
  const inputStyle = {
    backgroundColor: 'var(--background)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  };

  const hint = getHint();

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--card)' }}>
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
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
            style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%`, backgroundColor: 'var(--primary)' }}
          />
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Step {step} di {totalSteps} — {stepLabel(step)}
        </div>
      </div>

      {/* Step 1 — Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Informazioni generali
          </h2>

          {/* Tipo sondaggio */}
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Tipo di sondaggio
            </label>
            <div className="space-y-2">
              {POLL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setPollType(opt.value); setStep(1); }}
                  className="w-full rounded-xl px-4 py-3 text-left transition-all"
                  style={{
                    backgroundColor: pollType === opt.value ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                    border: `2px solid ${pollType === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: pollType === opt.value ? 'var(--primary-light)' : 'var(--text)' }}>
                        {opt.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                    </div>
                    {pollType === opt.value && (
                      <span className="ml-auto text-sm" style={{ color: 'var(--primary-light)' }}>✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Max choices (solo multi_choice) */}
          {pollType === 'multi_choice' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Numero massimo di preferenze per votante
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={maxChoices}
                onChange={(e) => setMaxChoices(Math.max(2, parseInt(e.target.value) || 2))}
                className={inputClass}
                style={inputStyle}
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Titolo *
            </label>
            <input
              type="text"
              placeholder="es. Elezioni club 2026"
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
              placeholder="es. Vota il tuo candidato preferito!"
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
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              Istruzioni per i votanti (opzionale)
            </label>
            <textarea
              placeholder="es. Scegli il candidato che vuoi eleggere..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              className={inputClass + ' resize-none'}
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Criteri (solo rating) */}
      {step === 2 && pollType === 'rating' && (
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
                  <div className="relative">
                    <button
                      onClick={() => setEmojiPickerOpen(emojiPickerOpen === i ? null : i)}
                      className="rounded-lg px-2 py-2 text-xl transition-colors"
                      style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', minWidth: '2.5rem' }}
                      title="Scegli emoji"
                    >
                      {c.emoji || '＋'}
                    </button>
                    {emojiPickerOpen === i && (
                      <div className="absolute left-0 top-10 z-20 rounded-xl p-2 shadow-xl grid grid-cols-5 gap-1"
                        style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', width: '180px' }}>
                        <button
                          onClick={() => { updateCriterion(i, 'emoji', ''); setEmojiPickerOpen(null); }}
                          className="rounded p-1 text-xs hover:bg-white/10"
                          style={{ color: 'var(--text-muted)' }}
                        >✕</button>
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => { updateCriterion(i, 'emoji', e); setEmojiPickerOpen(null); }}
                            className="rounded p-1 text-lg hover:bg-white/10 transition-colors"
                          >{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
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
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.excludeFromTotal}
                    onChange={(e) => updateCriterion(i, 'excludeFromTotal', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Non conta nel punteggio totale (classifica separata)
                  </span>
                </label>
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

      {/* Step elementi — step 2 per non-rating, step 3 per rating */}
      {((pollType === 'rating' && step === 3) || (pollType !== 'rating' && step === 2)) && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Elementi da votare
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Aggiungi gli elementi che verranno votati (minimo 2)
          </p>

          {/* Paste list */}
          {!showPaste ? (
            <button
              onClick={() => setShowPaste(true)}
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-all hover:scale-[1.01]"
              style={{ border: '2px dashed var(--border)', color: 'var(--text-muted)' }}
            >
              📋 Incolla lista
            </button>
          ) : (
            <div className="rounded-xl p-4 space-y-3"
              style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border)' }}>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                Incolla la lista — un elemento per riga
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Supporta formati: "Artista - Canzone", "1. Nome – Dettaglio", ecc.
              </p>
              <textarea
                autoFocus
                rows={6}
                placeholder={'Mario Rossi\nLuigi Verdi\nAnna Bianchi'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none resize-none font-mono"
                style={inputStyle}
              />
              {pasteText.trim() && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Anteprima ({parsedPreview.length} elementi):
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {parsedPreview.map((item, i) => (
                      <div key={i} className="flex items-baseline gap-2 rounded-lg px-3 py-1.5"
                        style={{ backgroundColor: 'var(--background)' }}>
                        <span className="text-xs w-4 shrink-0" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                        <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{item.name}</span>
                        {item.subtitle && (
                          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>· {item.subtitle}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPaste(false); setPasteText(''); }}
                  className="flex-1 rounded-lg py-2 text-sm font-medium"
                  style={{ backgroundColor: 'var(--background)', color: 'var(--text-muted)' }}
                >
                  Annulla
                </button>
                <button
                  onClick={confirmPaste}
                  disabled={parsedPreview.length === 0}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Aggiungi {parsedPreview.length > 0 ? `${parsedPreview.length} elementi` : ''}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-xl p-3"
                style={{ backgroundColor: 'var(--card-hover)', border: '1px solid var(--border)' }}
              >
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0}
                    className="text-xs disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>▲</button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1}
                    className="text-xs disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>▼</button>
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
                  <button onClick={() => removeItem(i)}
                    className="rounded-lg p-2 transition-colors hover:bg-red-500/20 text-red-400">
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

      {/* Step conferma — step 4 per rating, step 3 per non-rating */}
      {step === totalSteps && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Riepilogo
          </h2>

          <div className="rounded-xl p-4 space-y-1" style={{ backgroundColor: 'var(--card-hover)' }}>
            <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>{title}</p>
            {description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{description}</p>}
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Creato da: {creatorName}</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tipo: {POLL_TYPE_OPTIONS.find(o => o.value === pollType)?.label}
              {pollType === 'multi_choice' && ` (max ${maxChoices} preferenze)`}
            </p>
          </div>

          {pollType === 'rating' && (
            <div>
              <h3 className="mb-2 font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>
                CRITERI ({criteria.length})
              </h3>
              <div className="space-y-1">
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: 'var(--card-hover)' }}>
                    <span style={{ color: 'var(--text)' }}>
                      {c.emoji && <span className="mr-1">{c.emoji}</span>}{c.name}
                      {c.excludeFromTotal && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>(separata)</span>}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {c.minValue} – {c.maxValue}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
        {hint && (
          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>
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
          {step < totalSteps ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canGoNext()}
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
