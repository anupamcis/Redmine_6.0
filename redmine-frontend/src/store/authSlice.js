// Load initial state from localStorage if available
const loadInitialState = () => {
  try {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('redmineAuth') : null;
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        isAuthenticated: parsed.isAuthenticated || false,
        user: parsed.user || null,
        csrfToken: parsed.csrfToken || null,
        loading: false,
        error: null
      };
    }
  } catch (e) {
    console.warn('[authSlice] Failed to load auth state from localStorage:', e);
  }
  return { isAuthenticated: false, user: null, csrfToken: null, loading: false, error: null };
};

const initialState = { ...loadInitialState(), restoring: false };

// Helper to persist auth state
const persistAuthState = (state) => {
  try {
    if (typeof window !== 'undefined') {
      if (state.isAuthenticated && state.user) {
        window.localStorage.setItem('redmineAuth', JSON.stringify({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          csrfToken: state.csrfToken
        }));
      } else {
        window.localStorage.removeItem('redmineAuth');
      }
    }
  } catch (e) {
    console.warn('[authSlice] Failed to persist auth state:', e);
  }
};

export const loginRequest = () => ({ type: 'auth/loginRequest' });
export const loginSuccess = (payload) => ({ type: 'auth/loginSuccess', payload });
export const loginFailure = (error) => ({ type: 'auth/loginFailure', error });
export const logout = () => ({ type: 'auth/logout' });
export const restoreAuth = (payload) => ({ type: 'auth/restoreAuth', payload });
export const setRestoring = (restoring) => ({ type: 'auth/setRestoring', restoring });

export default function authReducer(state = initialState, action) {
  let newState;
  switch(action.type){
    case 'auth/loginRequest': 
      newState = { ...state, loading: true, error: null };
      break;
    case 'auth/loginSuccess': 
      newState = { ...state, loading: false, isAuthenticated: true, user: action.payload.user, csrfToken: action.payload.csrfToken };
      persistAuthState(newState);
      return newState;
    case 'auth/loginFailure': 
      newState = { ...state, loading: false, error: action.error };
      break;
    case 'auth/logout': 
      newState = { isAuthenticated: false, user: null, csrfToken: null, loading: false, error: null };
      persistAuthState(newState);
      return newState;
    case 'auth/restoreAuth':
      newState = { ...state, isAuthenticated: action.payload.isAuthenticated, user: action.payload.user, csrfToken: action.payload.csrfToken, loading: false, restoring: false };
      persistAuthState(newState);
      return newState;
    case 'auth/setRestoring':
      newState = { ...state, restoring: action.restoring };
      break;
    default: 
      return state;
  }
  return newState;
}


