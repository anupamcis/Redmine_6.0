const initialState = { 
  current: null, 
  loading: false, 
  error: null 
};

export const fetchTaskRequest = () => ({ type: 'task/fetchRequest' });
export const fetchTaskSuccess = (payload) => ({ type: 'task/fetchSuccess', payload });
export const updateTaskSuccess = (payload) => ({ type: 'task/updateSuccess', payload });
export const postCommentSuccess = (comment) => ({ type: 'task/postCommentSuccess', comment });
export const setError = (error) => ({ type: 'task/setError', error });
export const clearTask = () => ({ type: 'task/clear' });

export default function taskReducer(state = initialState, action) {
  switch(action.type) {
    case 'task/fetchRequest': 
      return { ...state, loading: true, error: null };
    case 'task/fetchSuccess': 
      return { ...state, loading: false, current: action.payload };
    case 'task/updateSuccess':
      return { ...state, current: { ...state.current, ...action.payload } };
    case 'task/postCommentSuccess':
      return { 
        ...state, 
        current: { 
          ...state.current, 
          journals: [...(state.current.journals || []), action.comment] 
        } 
      };
    case 'task/setError':
      return { ...state, loading: false, error: action.error };
    case 'task/clear':
      return initialState;
    default: 
      return state;
  }
}
