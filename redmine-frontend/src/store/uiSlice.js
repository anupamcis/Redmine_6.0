import { getStoredTheme } from '../styles/themes';

const initialState = { 
  sidebarCollapsed: false, 
  theme: getStoredTheme() || 'light' 
};

export const toggleSidebar = () => ({ type: 'ui/toggleSidebar' });
export const toggleTheme = () => ({ type: 'ui/toggleTheme' });
export const setTheme = (theme) => ({ type: 'ui/setTheme', payload: theme });

export default function uiReducer(state = initialState, action) {
  switch(action.type){
    case 'ui/toggleSidebar': 
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'ui/toggleTheme': 
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'ui/setTheme':
      return { ...state, theme: action.payload };
    default: 
      return state;
  }
}
