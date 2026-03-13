const initialState = { 
  list: [], 
  totalCount: 0,
  offset: 0,
  limit: 25,
  loading: false, 
  error: null,
  filters: {
    status_id: null,
    tracker_id: null,
    assigned_to_id: null,
    priority_id: null,
    search: '',
    role: null
  }
};

export const fetchIssuesRequest = () => ({ type: 'tasks/fetchRequest' });
export const fetchIssuesSuccess = (payload) => ({ type: 'tasks/fetchSuccess', payload });
export const setFilters = (filters) => ({ type: 'tasks/setFilters', filters });
export const clearFilters = () => ({ type: 'tasks/clearFilters' });
export const setError = (error) => ({ type: 'tasks/setError', error });

export default function tasksReducer(state = initialState, action) {
  switch(action.type) {
    case 'tasks/fetchRequest': 
      return { ...state, loading: true, error: null };
    case 'tasks/fetchSuccess': 
      return { 
        ...state, 
        loading: false, 
        list: action.payload.issues || [],
        totalCount: action.payload.total_count || 0,
        offset: action.payload.offset || 0,
        limit: action.payload.limit || 25
      };
    case 'tasks/setFilters':
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case 'tasks/clearFilters':
      return { ...state, filters: initialState.filters };
    case 'tasks/setError':
      return { ...state, loading: false, error: action.error };
    default: 
      return state;
  }
}
