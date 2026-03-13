// Theme definitions
export const themes = {
  light: {
    name: 'Light',
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      accent: '#8b5cf6',
      bg: '#ffffff',
      surface: '#f6f7fb',
      surface2: '#eef2ff',
      text: '#0b1324',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      cardBg: '#ffffff',
      inputBg: '#ffffff',
      sidebarBg: '#ffffff',
      headerBg: '#ffffff',
    }
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#6366f1',
      primaryDark: '#4f46e5',
      accent: '#a78bfa',
      bg: '#0f172a',
      surface: '#1e293b',
      surface2: '#334155',
      text: '#f1f5f9',
      textSecondary: '#cbd5e1',
      border: '#334155',
      cardBg: '#1e293b',
      inputBg: '#1e293b',
      sidebarBg: '#1e293b',
      headerBg: '#1e293b',
    }
  },
  purple: {
    name: 'Purple Dream',
    colors: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      accent: '#ec4899',
      bg: '#1e1b2e',
      surface: '#2d1b3d',
      surface2: '#3d2a4d',
      text: '#f3e8ff',
      textSecondary: '#d8b4fe',
      border: '#4c1d95',
      cardBg: '#2d1b3d',
      inputBg: '#2d1b3d',
      sidebarBg: '#1e1b2e',
      headerBg: '#1e1b2e',
    }
  },
  ocean: {
    name: 'Ocean Blue',
    colors: {
      primary: '#06b6d4',
      primaryDark: '#0891b2',
      accent: '#3b82f6',
      bg: '#0c1222',
      surface: '#1a2332',
      surface2: '#243447',
      text: '#e0f2fe',
      textSecondary: '#bae6fd',
      border: '#1e3a5f',
      cardBg: '#1a2332',
      inputBg: '#1a2332',
      sidebarBg: '#0c1222',
      headerBg: '#0c1222',
    }
  },
  sunset: {
    name: 'Sunset',
    colors: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      accent: '#ef4444',
      bg: '#1c1917',
      surface: '#292524',
      surface2: '#3d3634',
      text: '#fef3c7',
      textSecondary: '#fde68a',
      border: '#451a03',
      cardBg: '#292524',
      inputBg: '#292524',
      sidebarBg: '#1c1917',
      headerBg: '#1c1917',
    }
  },
  forest: {
    name: 'Forest',
    colors: {
      primary: '#10b981',
      primaryDark: '#059669',
      accent: '#34d399',
      bg: '#0a1f0a',
      surface: '#1a2e1a',
      surface2: '#2a3e2a',
      text: '#d1fae5',
      textSecondary: '#a7f3d0',
      border: '#064e3b',
      cardBg: '#1a2e1a',
      inputBg: '#1a2e1a',
      sidebarBg: '#0a1f0a',
      headerBg: '#0a1f0a',
    }
  }
};

export function applyTheme(themeName) {
  const theme = themes[themeName] || themes.light;
  const root = document.documentElement;
  
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value);
  });
  
  // Store in localStorage
  localStorage.setItem('theme', themeName);
}

export function getStoredTheme() {
  return localStorage.getItem('theme') || 'light';
}

