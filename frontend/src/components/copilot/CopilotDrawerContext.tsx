import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AiCopilotContext } from '../../core/aiCopilotContext';

interface CopilotDrawerState {
  isOpen: boolean;
  context: AiCopilotContext | null;
  open: (ctx?: AiCopilotContext | null) => void;
  close: () => void;
}

const CopilotDrawerContext = createContext<CopilotDrawerState>({
  isOpen: false,
  context: null,
  open: () => {},
  close: () => {},
});

export const useCopilotDrawer = () => useContext(CopilotDrawerContext);

export const CopilotDrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AiCopilotContext | null>(null);

  const open = useCallback((ctx?: AiCopilotContext | null) => {
    if (ctx) setContext(ctx);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep context in memory so session survives close/reopen
  }, []);

  return (
    <CopilotDrawerContext.Provider value={{ isOpen, context, open, close }}>
      {children}
    </CopilotDrawerContext.Provider>
  );
};
