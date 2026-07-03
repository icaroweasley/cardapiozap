import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
  previewBackground: { type: 'preset' | 'custom', value: string } | null;
  setPreviewBackground: (bg: { type: 'preset' | 'custom', value: string } | null) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  isDark: true, // default to dark
  previewBackground: null,
  setPreviewBackground: (bg) => set({ previewBackground: bg }),
  toggleTheme: () => set((state) => {
    const newIsDark = !state.isDark;
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    return { isDark: newIsDark };
  }),
}));

// Initialize theme on load
if (typeof window !== 'undefined') {
  document.documentElement.classList.add('dark');
}
