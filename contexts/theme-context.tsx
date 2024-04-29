import { createContext, PropsWithChildren, useContext, useState } from 'react';

import { AppPalette, darkPalette, lightPalette } from '@/constants/library-theme';

type ThemeContextValue = {
  isDark: boolean;
  palette: AppPalette;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [isDark, setIsDark] = useState(false);

  const palette = isDark ? darkPalette : lightPalette;
  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, palette, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
