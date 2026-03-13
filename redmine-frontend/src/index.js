import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/index';
import App from './App';
import './styles/index.css';
import { applyTheme, getStoredTheme } from './styles/themes';
import { restoreAuth } from './api/redmineAdapter';
import { restoreAuth as restoreAuthAction, setRestoring, logout } from './store/authSlice';
import { setBaseUrl as setDailyStatusBaseUrl } from './api/dailyStatusAdapter';
import { setBaseUrl as setTasksBaseUrl } from './api/redmineTasksAdapter';
import { setBaseUrl as setDmsfBaseUrl } from './api/dmsfAdapter';
import { setBaseUrl as setProjectSettingsBaseUrl } from './api/projectSettingsAdapter';

// Initialize adapter base URLs
setDailyStatusBaseUrl('http://localhost:4000');
setTasksBaseUrl('http://localhost:4000');
setDmsfBaseUrl('http://localhost:4000');
setProjectSettingsBaseUrl('http://localhost:4000');

// Initialize theme on app start
const savedTheme = getStoredTheme();
applyTheme(savedTheme);

// Restore authentication on app start
async function initApp() {
  const container = document.getElementById('root');
  const root = createRoot(container);
  
  // Check localStorage for stored credentials
  console.log('[initApp] Checking localStorage...');
  const storedCreds = typeof window !== 'undefined' ? window.localStorage.getItem('redmineCredentials') : null;
  const storedAuth = typeof window !== 'undefined' ? window.localStorage.getItem('redmineAuth') : null;
  console.log('[initApp] Stored credentials:', storedCreds ? 'Found' : 'Not found');
  console.log('[initApp] Stored auth:', storedAuth ? 'Found' : 'Not found');
  
  // Render app immediately (auth state is loaded from localStorage synchronously)
  root.render(
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  );
  
  // Then verify credentials asynchronously
  try {
    console.log('[initApp] Starting auth restoration...');
    store.dispatch(setRestoring(true));
    
    const authResult = await restoreAuth();
    console.log('[initApp] Auth restoration result:', authResult);
    
    if (authResult && authResult.user) {
      console.log('[initApp] Auth restored successfully, user:', authResult.user.login);
      store.dispatch(restoreAuthAction({
        isAuthenticated: true,
        user: authResult.user,
        csrfToken: null
      }));
      console.log('[initApp] Auth state updated in Redux');
    } else {
      console.log('[initApp] Auth restoration failed, clearing state');
      // If restore failed, clear any stale auth state
      store.dispatch(logout());
    }
  } catch (error) {
    console.error('[initApp] Failed to restore auth:', error);
    store.dispatch(logout());
  } finally {
    store.dispatch(setRestoring(false));
    console.log('[initApp] Auth restoration complete');
  }
}

initApp();
