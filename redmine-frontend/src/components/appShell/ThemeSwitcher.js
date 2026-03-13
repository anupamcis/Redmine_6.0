import React, { useState, useEffect, useRef } from 'react';
import { Palette, Check, Sparkles } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { setTheme } from '../../store/uiSlice';
import { themes, applyTheme } from '../../styles/themes';

export default function ThemeSwitcher() {
  const dispatch = useDispatch();
  const currentTheme = useSelector(state => state.ui.theme);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    // Apply theme on mount and when it changes
    applyTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleThemeChange = (themeName) => {
    dispatch(setTheme(themeName));
    applyTheme(themeName);
    setShowMenu(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="h-9 w-9 grid place-items-center rounded-lg hover:bg-[var(--theme-surface)] transition-all duration-200 hover:scale-110 text-[var(--theme-textSecondary)] group"
      >
        <Palette size={18} className="group-hover:text-[var(--theme-primary)] transition-colors" />
      </button>

      {showMenu && (
        <div 
          className="absolute right-0 top-12 mt-2 w-64 rounded-xl shadow-2xl border border-[var(--theme-border)] py-3 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden"
          style={{ backgroundColor: 'var(--theme-cardBg)' }}
        >
          <div className="px-4 py-2 border-b border-[var(--theme-border)] flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--theme-primary)]" />
            <span className="text-sm font-semibold text-[var(--theme-text)]">Choose Theme</span>
          </div>
          
          <div className="py-2 max-h-96 overflow-y-auto">
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`
                  w-full px-4 py-3 flex items-center justify-between transition-all duration-200 group
                  ${currentTheme === key 
                    ? 'bg-gradient-to-r from-[var(--theme-primary)]/10 to-[var(--theme-accent)]/10' 
                    : 'hover:bg-[var(--theme-surface)]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg shadow-md ring-2 ring-offset-2 transition-all duration-200"
                    style={{
                      background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`,
                      ringColor: currentTheme === key ? theme.colors.primary : 'transparent',
                      ringOffsetColor: 'var(--theme-cardBg)'
                    }}
                  ></div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${currentTheme === key ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>
                      {theme.name}
                    </div>
                    <div className="text-xs text-[var(--theme-textSecondary)]">
                      {key === 'light' ? 'Clean & bright' : 
                       key === 'dark' ? 'Easy on the eyes' :
                       key === 'purple' ? 'Vibrant & modern' :
                       key === 'ocean' ? 'Calm & professional' :
                       key === 'sunset' ? 'Warm & energetic' :
                       'Natural & fresh'}
                    </div>
                  </div>
                </div>
                {currentTheme === key && (
                  <Check size={18} className="text-[var(--theme-primary)] animate-in fade-in" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
