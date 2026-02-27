'use client';

import { useState } from 'react';

interface Props {
  slug: string;
}

export default function ShareButton({ slug }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/poll/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="w-full rounded-xl py-3 text-sm font-medium transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: copied ? 'rgba(16,185,129,0.15)' : 'var(--card-hover)',
        color: copied ? 'var(--success)' : 'var(--text-muted)',
        border: '1px solid var(--border)',
      }}
    >
      {copied ? '✓ Link copiato!' : '🔗 Condividi link'}
    </button>
  );
}
