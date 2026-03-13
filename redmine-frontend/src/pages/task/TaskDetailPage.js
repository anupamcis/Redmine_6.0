import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as adapter from '../../api/redmineTasksAdapter';

export default function TaskDetailPage(){
  const { threadId } = useParams();
  const [thread, setThread] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(()=>{ (async ()=>{
    const data = await adapter.fetchThread(threadId);
    setThread(data);
  })(); }, [threadId]);

  if (!thread) return <div className="p-6">Loading...</div>;

  const submitComment = async () => {
    const res = await adapter.postComment(threadId, { bodyHtml: comment });
    setThread({...thread, messages: (thread.messages||[]).concat({ messageId: res.commentId || Date.now(), author:{name:'You'}, createdAt: new Date().toISOString(), bodyHtml: comment })});
    setComment('');
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">{thread.subject}</h2>
      <div className="space-y-4 mt-4">
        {(thread.messages || []).map(m => (
          <article key={m.messageId} className="p-3 bg-white rounded shadow-sm">
            <div className="text-sm text-gray-600">{m.author.name} — {new Date(m.createdAt).toLocaleString()}</div>
            <div className="mt-2" dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
          </article>
        ))}
      </div>

      <div className="mt-4 bg-white p-4 rounded shadow-sm">
        <textarea value={comment} onChange={e=>setComment(e.target.value)} rows="4" className="w-full p-2 border rounded" />
        <div className="mt-2">
          <button onClick={submitComment} className="px-4 py-2 bg-[var(--primary)] text-white rounded">Post comment</button>
        </div>
      </div>
    </div>
  );
}

