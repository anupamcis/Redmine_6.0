const initialState = { projects: [], currentProject: null, loading:false, error:null };

export const fetchProjectsRequest = () => ({ type: 'projects/fetchRequest' });
export const fetchProjectsSuccess = (payload) => ({ type: 'projects/fetchSuccess', payload });
export const fetchProjectsFailure = (error) => ({ type: 'projects/fetchFailure', error });
export const setCurrentProject = (project) => ({ type: 'projects/setCurrent', project });

export default function projectsReducer(state = initialState, action) {
  switch(action.type){
    case 'projects/fetchRequest': return { ...state, loading:true };
    case 'projects/fetchSuccess': return { ...state, loading:false, projects: action.payload };
    case 'projects/fetchFailure': return { ...state, loading:false, error:action.error };
    case 'projects/setCurrent': return { ...state, currentProject: action.project };
    default: return state;
  }
}


