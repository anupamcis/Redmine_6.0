import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoardSuccess } from '../../store/kanbanSlice';
import * as adapter from '../../api/redmineTasksAdapter';
import { useParams } from 'react-router-dom';

export default function KanbanBoardPage(){
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const board = useSelector(s => s.kanban.board);

  useEffect(()=>{ (async ()=>{
    const data = await adapter.fetchBoard(projectId || 12);
    dispatch(fetchBoardSuccess(data));
  })(); }, [projectId, dispatch]);

  if (!board) return <div className="p-6">Loading board...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Kanban - Project {projectId || 12}</h1>
      <div className="flex gap-4 overflow-x-auto">
        {board.columns.map(col => (
          <div key={col.id} className="min-w-[280px] bg-[var(--surface)] p-3 rounded">
            <h3 className="font-medium mb-2">{col.name} ({col.cards.length})</h3>
            <div className="space-y-2">
              {col.cards.map(card => (
                <div key={card.id} className="p-3 bg-white rounded shadow-sm">
                  <div className="text-sm font-medium">{card.subject}</div>
                  <div className="text-xs text-gray-500">{card.assignee ? card.assignee.name : ''}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

