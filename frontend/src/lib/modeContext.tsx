'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type AppMode = 'demo' | 'live';

interface ModeContextValue {
  mode: AppMode;
  restaurantName: string | null;
  setMode: (mode: AppMode, name?: string) => void;
}

const ModeContext = createContext<ModeContextValue>({
  mode: 'live',
  restaurantName: null,
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>('live');
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  function setMode(m: AppMode, name?: string) {
    setModeState(m);
    setRestaurantName(name ?? null);
  }

  return (
    <ModeContext.Provider value={{ mode, restaurantName, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(ModeContext);
}
