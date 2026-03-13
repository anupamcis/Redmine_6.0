import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';
import authReducer from './authSlice';
import projectsReducer from './projectsSlice';
import uiReducer from './uiSlice';
import dailyStatusReducer from './dailyStatusSlice';
import tasksReducer from './tasksSlice';
import taskReducer from './taskSlice';
import kanbanReducer from './kanbanSlice';
import notificationReducer from './notificationSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  projects: projectsReducer,
  ui: uiReducer,
  dailyStatus: dailyStatusReducer,
  tasks: tasksReducer,
  task: taskReducer,
  kanban: kanbanReducer,
  notifications: notificationReducer
});

const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;


