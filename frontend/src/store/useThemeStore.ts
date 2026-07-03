import { create } from 'zustand';

interface ThemeStore {
  isDark: boolean;
  toggleTheme: () => void;
  previewBackground: { backgroundType: 'preset' | 'custom', backgroundValue: string } | null;
  setPreviewBackground: (bg: { backgroundType: 'preset' | 'custom', backgroundValue: string } | null) => void;
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
