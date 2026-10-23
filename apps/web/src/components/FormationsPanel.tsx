'use client';

import { useState } from 'react';
import {
  deleteFormation,
  fromFormation,
  loadFormations,
  saveFormation,
  toFormation,
  type Formation,
} from '@/lib/formations';
import {
  draftFromPlacements,
  draftToPlacements,
  isDraftComplete,
  type Draft,
} from '@/lib/setupDraft';
import { HUMAN } from '@/store/game';

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

interface FormationsPanelProps {
  draft: Draft;
  onLoad: (draft: Draft) => void;
}

export function FormationsPanel({ draft, onLoad }: FormationsPanelProps) {
  const [list, setList] = useState<Formation[]>(() => loadFormations(browserStorage()));
  const [name, setName] = useState('');
  const complete = isDraftComplete(draft);

  function save() {
    const trimmed = name.trim();
    if (!trimmed || !complete) return;
    setList(saveFormation(browserStorage(), toFormation(trimmed, HUMAN, draftToPlacements(draft))));
    setName('');
  }

  return (
    <section className="flex flex-col gap-2 border-2 border-black/50 bg-black/25 p-2">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder={complete ? 'Nome da formação' : 'Complete as 40 peças'}
          disabled={!complete}
          className="min-w-0 flex-1 border-2 border-black/60 bg-black/40 px-2 text-lg"
        />
        <button type="submit" className="btn" disabled={!complete || !name.trim()}>
          Salvar
        </button>
      </form>
      {list.length === 0 ? (
        <p className="opacity-70">Nenhuma formação salva.</p>
      ) : (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
          {list.map((f) => (
            <li key={f.name} className="flex items-center gap-2">
              <span className="flex-1 truncate">{f.name}</span>
              <button
                type="button"
                className="btn py-0"
                onClick={() => onLoad(draftFromPlacements(fromFormation(f, HUMAN)))}
              >
                Usar
              </button>
              <button
                type="button"
                className="btn py-0"
                aria-label={`Apagar ${f.name}`}
                onClick={() => setList(deleteFormation(browserStorage(), f.name))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
