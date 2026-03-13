import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchThreadsRequest, fetchThreadsSuccess, appendThreads } from '../../store/tasksSlice';
import * as adapter from '../../api/redmineTasksAdapter';
import { useNavigate } from 'react-router-dom';

export default function MyTasksPage(){
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list, cursor } = useSelector(s => s.tasks);
  const loadingRef = useRef(false);

  useEffect(()=>{ (async ()=>{
    dispatch(fetchThreadsRequest());
    const data = await adapter.fetchThreads();
    dispatch(fetchThreadsSuccess(data));
  })(); }, [dispatch]);

  useEffect(() => {
    async function onScroll(){
      if (loadingRef.current) return;
      if (!cursor) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
        loadingRef.current = true;
        const data = await adapter.fetchThreads(cursor);
        dispatch(appendThreads(data));
        loadingRef.current = false;
      }
    }
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [cursor, dispatch]);

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">My Tasks</h1>
      </header>
      <div className="space-y-2">
        {list.map(t => (
          <div key={t.threadId} className={"p-3 bg-white rounded shadow-sm " + (t.unread ? 'font-semibold' : '')} onClick={()=>navigate('/task/'+t.threadId)}>
            <div>{t.subject}</div>
            <div className="text-sm text-gray-500">Created by {t.participants && t.participants[0] ? t.participants[0].name : '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

