'use client';

import { motion, AnimatePresence } from 'framer-motion';

type SaveStatus = 'saving' | 'saved' | 'error' | null;

interface Props {
  criterionName: string;
  minValue: number;
  maxValue: number;
  saveStatus: SaveStatus;
  onValueChange: (value: number) => void;
  currentValue: number;
}

export default function VoteSlider({
  criterionName,
  minValue,
  maxValue,
  saveStatus,
  onValueChange,
  currentValue,
}: Props) {
  const range = maxValue - minValue + 1;
  const useSlider = range > 15;
  const values = Array.from({ length: range }, (_, i) => minValue + i);

  // Colore del valore selezionato (rosso → verde)
  const pct = maxValue > minValue ? (currentValue - minValue) / (maxValue - minValue) : 0;
  const hue = Math.round(pct * 120);

  return (
    <div className="space-y-2.5">
      {/* Header: nome criterio + status salvataggio */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {criterionName}
        </span>
        <AnimatePresence mode="wait">
          {saveStatus === 'saving' && (
            <motion.span key="saving"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-xs" style={{ color: 'var(--text-muted)' }}>
              salvataggio...
            </motion.span>
          )}
          {saveStatus === 'saved' && (
            <motion.span key="saved"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs font-medium" style={{ color: 'var(--success)' }}>
              ✓ Salvato
            </motion.span>
          )}
          {saveStatus === 'error' && (
            <motion.span key="error"
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="text-xs font-medium" style={{ color: '#f87171' }}>
              ⚠ Errore
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Bottoni numerici (range ≤ 15) */}
      {!useSlider && (
        <div
          className="grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.min(range, 5)}, 1fr)` }}
        >
          {values.map((v) => {
            const vPct = maxValue > minValue ? (v - minValue) / (maxValue - minValue) : 0;
            const vHue = Math.round(vPct * 120);
            const isSelected = v === currentValue;
            return (
              <motion.button
                key={v}
                onClick={() => onValueChange(v)}
                whileTap={{ scale: 0.85 }}
                className="rounded-lg py-3 text-sm font-bold"
                style={{
                  backgroundColor: isSelected
                    ? `hsl(${vHue}, 65%, 38%)`
                    : 'var(--card-hover)',
                  color: isSelected ? '#fff' : 'var(--text-muted)',
                  border: isSelected
                    ? `2px solid hsl(${vHue}, 65%, 52%)`
                    : '2px solid var(--border)',
                  boxShadow: isSelected
                    ? `0 0 12px hsl(${vHue}, 65%, 30%)`
                    : 'none',
                  transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
                }}
              >
                {v}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Slider fallback (range > 15) */}
      {useSlider && (
        <div className="space-y-1.5">
          <div className="relative">
            <input
              type="range"
              min={minValue}
              max={maxValue}
              value={currentValue}
              onChange={(e) => onValueChange(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{minValue}</span>
            <span
              className="font-bold tabular-nums"
              style={{ color: `hsl(${hue}, 70%, 60%)` }}
            >
              {currentValue}
            </span>
            <span>{maxValue}</span>
          </div>
        </div>
      )}
    </div>
  );
}
