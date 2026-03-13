import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchBoardSuccess, moveCardOptimistic, revertCardMove, updateCardField } from '../../store/kanbanSlice';
import { getIssues, getIssueStatuses, getIssuePriorities, getProjectMembers, getProjectTrackers, updateIssue } from '../../api/redmineTasksAdapter';
import { Plus, MoreVertical, Settings2, User, Calendar, Flag, Clock } from 'lucide-react';
import ColumnSelector from '../../components/kanban/ColumnSelector';
import TaskDetailModal from '../../components/tasks/TaskDetailModal';
import NewTaskModal from '../../components/kanban/NewTaskModal';
import { cachedApiCall, apiCache } from '../../utils/apiCache';

export default function KanbanBoardPage() {
  const dispatch = useDispatch();
  const { projectName } = useParams();
  const board = useSelector(s => s.kanban.board);
  const [loading, setLoading] = useState(true);
  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [allStatuses, setAllStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [editingField, setEditingField] = useState(null); // { cardId, field: 'assignee' | 'dueDate' | 'priority' | 'estimatedHours' | 'spentHours' }
  const [selectedTaskId, setSelectedTaskId] = useState(null); // Task ID for modal
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskStatusId, setNewTaskStatusId] = useState(null);

  useEffect(() => {
    loadSelectedColumns();
    loadBoard();
    loadMembersAndPriorities();
  }, [projectName]);

  // OPTIMIZED: Load members, priorities, and trackers with caching
  const loadMembersAndPriorities = async () => {
    try {
      // OPTIMIZED: Use cached API calls for metadata - instant on repeat visits
      const [membersData, prioritiesData, trackersData] = await Promise.all([
        cachedApiCall(`kanban_members_${projectName}`, async () => {
          return await getProjectMembers(projectName);
        }),
        cachedApiCall('kanban_priorities', async () => {
          return await getIssuePriorities();
        }),
        cachedApiCall(`kanban_trackers_${projectName}`, async () => {
          return await getProjectTrackers(projectName);
        })
      ]);
      setMembers(membersData);
      setPriorities(prioritiesData);
      setTrackers(trackersData);
    } catch (error) {
      console.error('[KanbanBoardPage] Error loading members/priorities:', error);
    }
  };

  const openNewTaskModal = (statusId = null) => {
    setNewTaskStatusId(statusId ? String(statusId) : null);
    setShowNewTaskModal(true);
  };

  // Default columns that should be shown if user hasn't made a selection
  const getDefaultColumns = (allStatuses) => {
    const defaultStatusNames = ['New', 'In Progress', 'Resolved', 'Closed', 'Reopen'];
    return allStatuses
      .filter(status => defaultStatusNames.includes(status.name))
      .sort((a, b) => {
        // Sort by the order in defaultStatusNames array
        const indexA = defaultStatusNames.indexOf(a.name);
        const indexB = defaultStatusNames.indexOf(b.name);
        return indexA - indexB;
      });
  };

  const loadSelectedColumns = () => {
    try {
      const stored = localStorage.getItem(`kanban-columns-${projectName}`);
      if (stored) {
        setSelectedColumns(JSON.parse(stored));
      }
      // If no stored selection, don't set anything yet - will be set in loadBoard after statuses are loaded
    } catch (error) {
      console.error('[KanbanBoardPage] Error loading selected columns:', error);
    }
  };

  const saveSelectedColumns = async (columns) => {
    try {
      localStorage.setItem(`kanban-columns-${projectName}`, JSON.stringify(columns));
      setSelectedColumns(columns);
      // Reload board immediately with new column selection
      // Use a small delay to ensure state is updated
      setTimeout(() => {
        loadBoard();
      }, 50);
    } catch (error) {
      console.error('[KanbanBoardPage] Error saving selected columns:', error);
    }
  };

  // OPTIMIZED: Load board with caching
  const loadBoard = async () => {
    setLoading(true);
    try {
      // OPTIMIZED: Load statuses with caching - instant on repeat visits
      const [statusesData] = await Promise.all([
        cachedApiCall('kanban_statuses', async () => {
          return await getIssueStatuses();
        })
      ]);

      // Store all statuses for column selector
      const allStatusesList = statusesData
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(status => ({
          id: status.id,
          name: status.name,
          position: status.position || 0
        }));
      setAllStatuses(allStatusesList);

      // Load selected columns from localStorage (fast operation)
      let currentSelected = [];
      try {
        const stored = localStorage.getItem(`kanban-columns-${projectName}`);
        if (stored) {
          currentSelected = JSON.parse(stored);
          if (JSON.stringify(currentSelected) !== JSON.stringify(selectedColumns)) {
            setSelectedColumns(currentSelected);
          }
        } else {
          currentSelected = getDefaultColumns(allStatusesList);
          localStorage.setItem(`kanban-columns-${projectName}`, JSON.stringify(currentSelected));
          setSelectedColumns(currentSelected);
        }
      } catch (error) {
        console.error('[KanbanBoardPage] Error loading selected columns:', error);
        currentSelected = getDefaultColumns(allStatusesList);
        setSelectedColumns(currentSelected);
      }

      const columnsToShow = currentSelected.length > 0 ? currentSelected : getDefaultColumns(allStatusesList);
      
      // OPTIMIZED: Create cache key based on selected columns
      const columnIds = columnsToShow.map(c => c.id).sort().join(',');
      const cacheKey = `kanban_issues_${projectName}_columns_${columnIds}`;
      
      // OPTIMIZED: Use cached API call for issues - instant on repeat visits
      const allIssues = await cachedApiCall(cacheKey, async () => {
        // OPTIMIZATION: Fetch issues with higher limit (250 instead of 100) to reduce requests
        // Note: Redmine API doesn't support comma-separated status_ids, so we fetch all and filter client-side
        // This is still faster than sequential pagination
        // OPTIMIZATION: Don't include relations for Kanban (not needed, saves processing time)
        const firstPage = await getIssues(projectName, { 
          limit: 250, 
          offset: 0, 
          status_id: '*',
          include_relations: false
        });

        let issues = firstPage.issues || [];
        let totalCount = firstPage.total_count || issues.length;
        const limit = 250; // Increased limit to reduce number of requests
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(totalCount / limit);
        
        // OPTIMIZATION: Fetch remaining pages in parallel instead of sequentially
        if (totalPages > 1) {
          const remainingPages = [];
          for (let page = 1; page < totalPages; page++) {
            remainingPages.push(
              getIssues(projectName, {
                limit,
                offset: page * limit,
                status_id: '*',
                include_relations: false
              })
            );
          }
          
          // Fetch all remaining pages in parallel
          const remainingResults = await Promise.all(remainingPages);
          remainingResults.forEach(result => {
            if (result.issues && result.issues.length > 0) {
              issues = issues.concat(result.issues);
            }
          });
        }
        
        return issues;
      });

      // Debug logging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('[KanbanBoardPage] Loaded issues:', {
          totalIssues: allIssues.length,
          issuesByStatus: allIssues.reduce((acc, issue) => {
            const statusName = issue.status?.name || 'Unknown';
            acc[statusName] = (acc[statusName] || 0) + 1;
            return acc;
          }, {})
        });
      }

      // Group issues by status and filter by selected columns
      const columns = columnsToShow
        .map(selectedCol => {
          const status = statusesData.find(s => s.id === selectedCol.id);
          if (!status) {
            console.warn('[KanbanBoardPage] Status not found for selected column:', selectedCol);
            return null;
          }
          
          const matchingIssues = allIssues.filter(issue => {
            return issue.status && issue.status.id === status.id;
          });
          
          return {
            id: status.id,
            name: status.name,
            position: status.position || 0,
            cards: matchingIssues.map(issue => ({
                id: issue.id,
                subject: issue.subject,
                description: issue.description ? issue.description.replace(/<[^>]*>/g, '').substring(0, 100) : '',
                assignee: issue.assigned_to ? { id: issue.assigned_to.id, name: issue.assigned_to.name } : null,
                tracker: issue.tracker ? issue.tracker.name : '',
                priority: issue.priority ? issue.priority.name : '',
                priorityId: issue.priority ? issue.priority.id : null,
                dueDate: issue.due_date,
                estimatedHours: issue.estimated_hours,
                spentHours: issue.spent_hours
              }))
          };
        })
        .filter(col => col !== null);

      dispatch(fetchBoardSuccess({ columns }));
    } catch (error) {
      console.error('[KanbanBoardPage] Error loading board:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, card) => {
    setIsDragging(true);
    setWasDragging(false);
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    setIsDragging(false);
    setWasDragging(true);
    setDraggedCard(null);
    setDraggedOverColumn(null);
    // Reset opacity
    e.currentTarget.style.opacity = '1';
    // Clear wasDragging after a short delay to prevent click navigation
    setTimeout(() => setWasDragging(false), 100);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = (e) => {
    // Only clear if we're leaving the column area (not just moving to a child)
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDraggedOverColumn(null);
    }
  };

  // OPTIMIZED: Handle drop with cache clearing
  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedCard || draggedCard.statusId === targetColumnId) {
      setDraggedCard(null);
      setDraggedOverColumn(null);
      setIsDragging(false);
      return;
    }

    const sourceColumnId = draggedCard.statusId;
    const cardId = draggedCard.id;

    // Optimistically update UI immediately (no page reload)
    dispatch(moveCardOptimistic(cardId, sourceColumnId, targetColumnId));

    // Clear drag state immediately for smooth UX
    setDraggedCard(null);
    setDraggedOverColumn(null);
    setIsDragging(false);

    // Make API call in background
    try {
      console.log('[KanbanBoardPage] Moving card', cardId, 'from status', sourceColumnId, 'to status', targetColumnId);
      const result = await updateIssue(cardId, { status_id: targetColumnId });
      console.log('[KanbanBoardPage] Move successful:', result);
      
      // OPTIMIZED: Clear cache for kanban issues to ensure fresh data on next load
      const columnIds = selectedColumns.map(c => c.id).sort().join(',');
      apiCache.clear(`kanban_issues_${projectName}_columns_${columnIds}`);
      
      // No need to reload entire board - optimistic update already handled UI change
      // The card has been moved in the UI and the server has been updated
    } catch (error) {
      console.error('[KanbanBoardPage] Error moving card:', error);
      console.error('[KanbanBoardPage] Error details:', {
        cardId: cardId,
        fromStatus: sourceColumnId,
        toStatus: targetColumnId,
        errorMessage: error.message,
        errorStack: error.stack
      });
      
      // Revert the optimistic update on error
      dispatch(revertCardMove(cardId, sourceColumnId, targetColumnId));
      
      // Show error message
      alert('Failed to move card: ' + (error.message || error.toString()));
    }
  };

  const getStatusColor = (statusName) => {
    // Status-specific colors - each column has its own distinct color
    const colors = {
      'New': 'bg-blue-500',
      'In Progress': 'bg-orange-500',
      'Resolved': 'bg-green-500',
      'Feedback': 'bg-yellow-500',
      'Reopen': 'bg-red-500', // Always red
      'Closed': 'bg-gray-500',
      'Obsolete': 'bg-gray-400',
      'Rejected': 'bg-red-600'
    };
    // Fallback to a default color if status not found
    return colors[statusName] || 'bg-[var(--theme-textSecondary)]';
  };

  const getPriorityColor = (priorityName) => {
    // Use theme-aware colors
    const colors = {
      'Immediate': 'bg-red-500',
      'Urgent': 'bg-orange-500',
      'High': 'bg-yellow-500',
      'Normal': 'bg-[var(--theme-primary)]',
      'Low': 'bg-[var(--theme-textSecondary)]'
    };
    return colors[priorityName] || 'bg-[var(--theme-textSecondary)]';
  };

  // OPTIMIZED: Handle field update with cache clearing
  const handleFieldUpdate = async (cardId, field, value) => {
    // Prepare metadata for optimistic update
    let metadata = {};
    let optimisticValue = value;
    
    if (field === 'assignee') {
      const member = members.find(m => m.id.toString() === value.toString());
      if (member) {
        metadata.member = member;
        metadata.memberName = member.name;
      }
      optimisticValue = value || null;
    } else if (field === 'priority') {
      const priority = priorities.find(p => p.id.toString() === value.toString());
      if (priority) {
        metadata.priority = priority;
        metadata.priorityName = priority.name;
      }
      optimisticValue = value || null;
    } else if (field === 'dueDate') {
      optimisticValue = value || null;
    } else if (field === 'estimatedHours') {
      optimisticValue = value ? parseFloat(value) : null;
    } else if (field === 'spentHours') {
      optimisticValue = value ? parseFloat(value) : null;
    }
    
    // Optimistically update the UI immediately
    dispatch(updateCardField(cardId, field, optimisticValue, metadata));
    setEditingField(null);
    
    // Make API call in background
    try {
      const payload = {};
      if (field === 'assignee') {
        payload.assigned_to_id = value || '';
      } else if (field === 'dueDate') {
        payload.due_date = value || '';
      } else if (field === 'priority') {
        payload.priority_id = value || '';
      } else if (field === 'estimatedHours') {
        payload.estimated_hours = value ? parseFloat(value) : null;
      } else if (field === 'spentHours') {
        // Note: spent_hours is typically updated via time entries, but we'll allow direct update
        // If your Redmine setup doesn't support direct spent_hours update, you may need to use time entries API
        payload.spent_hours = value ? parseFloat(value) : null;
      }
      
      await updateIssue(cardId, payload);
      
      // OPTIMIZED: Clear cache for kanban issues to ensure fresh data on next load
      const columnIds = selectedColumns.map(c => c.id).sort().join(',');
      apiCache.clear(`kanban_issues_${projectName}_columns_${columnIds}`);
      
      // No need to reload - UI already updated optimistically
      // Optionally, we could fetch just this one issue to ensure sync, but optimistic update is usually sufficient
    } catch (error) {
      console.error('[KanbanBoardPage] Error updating field:', error);
      // On error, reload board to revert to server state
      await loadBoard();
      alert('Failed to update ' + field + ': ' + (error.message || error.toString()));
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--theme-textSecondary)]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
          <span>Loading board...</span>
        </div>
      </div>
    );
  }

  if (!board || !board.columns) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-[var(--theme-textSecondary)]">No board data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[var(--theme-bg)]">
      {/* Header */}
      <div className="border-b border-[var(--theme-border)] bg-[var(--theme-cardBg)] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--theme-text)]">Kanban Board</h1>
            <p className="text-sm text-[var(--theme-textSecondary)] mt-1">
              {projectName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColumnSelector(true)}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--theme-border)] rounded-lg text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-colors"
              title="Configure columns"
            >
              <Settings2 size={18} />
              <span className="hidden sm:inline">Columns</span>
            </button>
            <button
              onClick={() => openNewTaskModal()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primaryDark)] transition-colors shadow-sm"
            >
              <Plus size={18} />
              New Task
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full">
          {board.columns.map(column => {
            const isNewColumn = column.name.toLowerCase() === 'new';
            const isDraggedOver = draggedOverColumn === column.id;
            
            return (
            <div
              key={column.id}
              className={`flex-shrink-0 w-80 flex flex-col transition-all ${
                isDraggedOver ? 'ring-2 ring-[var(--theme-primary)] ring-offset-2' : ''
              }`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`${getStatusColor(column.name)} text-white px-4 py-3 rounded-t-lg flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{column.name}</h3>
                  <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm">
                    {column.cards.length}
                  </span>
                </div>
                <button className="p-1 hover:bg-white/20 rounded transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Cards */}
              <div 
                className={`flex-1 bg-[var(--theme-surface)] rounded-b-lg p-3 space-y-3 overflow-y-auto min-h-[400px] transition-all ${
                  isDraggedOver ? 'bg-[var(--theme-primary)]/5' : ''
                }`}
              >
                {column.cards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...card, statusId: column.id })}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      // Don't open modal if clicking on editable fields or if we just finished dragging
                      if (wasDragging || e.target.closest('.editable-field')) {
                        return;
                      }
                      setSelectedTaskId(card.id);
                    }}
                    className="bg-[var(--theme-cardBg)] rounded-lg border border-[var(--theme-border)] p-4 cursor-move hover:shadow-md transition-shadow group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors flex-1">
                        {card.subject}
                      </h4>
                      <div 
                        className="editable-field flex items-center gap-1 cursor-pointer hover:bg-[var(--theme-surface)] rounded px-1 py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(editingField?.cardId === card.id && editingField?.field === 'priority' ? null : { cardId: card.id, field: 'priority' });
                        }}
                      >
                        {editingField?.cardId === card.id && editingField?.field === 'priority' ? (
                          <select
                            className="text-xs bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded px-2 py-1 text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                            value={priorities.find(p => p.name === card.priority || p.id.toString() === card.priorityId?.toString())?.id || ''}
                            onChange={(e) => handleFieldUpdate(card.id, 'priority', e.target.value)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">None</option>
                            {priorities.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            {card.priority && (
                              <span className={`w-2 h-2 rounded-full ${getPriorityColor(card.priority)} flex-shrink-0`} title={card.priority} />
                            )}
                            <Flag size={12} className="text-[var(--theme-textSecondary)]" />
                          </>
                        )}
                      </div>
                    </div>
                    {card.description && (
                      <p className="text-sm text-[var(--theme-textSecondary)] mb-3 line-clamp-2">
                        {card.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[var(--theme-textSecondary)]">
                      {/* Assignee */}
                      <div 
                        className="editable-field flex items-center gap-1 cursor-pointer hover:bg-[var(--theme-surface)] rounded px-1 py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(editingField?.cardId === card.id && editingField?.field === 'assignee' ? null : { cardId: card.id, field: 'assignee' });
                        }}
                      >
                        {editingField?.cardId === card.id && editingField?.field === 'assignee' ? (
                          <select
                            className="text-xs bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded px-2 py-1 text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                            value={card.assignee?.id || ''}
                            onChange={(e) => handleFieldUpdate(card.id, 'assignee', e.target.value)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Unassigned</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            {card.assignee ? (
                              <>
                                <div className="w-5 h-5 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center">
                                  <span className="text-[10px] font-medium text-[var(--theme-primary)]">
                                    {card.assignee.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span>{card.assignee.name}</span>
                              </>
                            ) : (
                              <>
                                <User size={12} className="text-[var(--theme-textSecondary)]" />
                                <span>Unassigned</span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                      
                      {/* Due Date */}
                      <div 
                        className="editable-field flex items-center gap-1 cursor-pointer hover:bg-[var(--theme-surface)] rounded px-1 py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(editingField?.cardId === card.id && editingField?.field === 'dueDate' ? null : { cardId: card.id, field: 'dueDate' });
                        }}
                      >
                        {editingField?.cardId === card.id && editingField?.field === 'dueDate' ? (
                          <input
                            type="date"
                            className="text-xs bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded px-2 py-1 text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                            value={card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleFieldUpdate(card.id, 'dueDate', e.target.value || null)}
                            onBlur={() => setEditingField(null)}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <Calendar size={12} className="text-[var(--theme-textSecondary)]" />
                            <span>{card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date'}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Estimated and Spent Hours */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-[var(--theme-textSecondary)]">
                      {/* Estimated Hours */}
                      <div 
                        className="editable-field flex items-center gap-1 cursor-pointer hover:bg-[var(--theme-surface)] rounded px-1 py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(editingField?.cardId === card.id && editingField?.field === 'estimatedHours' ? null : { cardId: card.id, field: 'estimatedHours' });
                        }}
                      >
                        {editingField?.cardId === card.id && editingField?.field === 'estimatedHours' ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-16 text-xs bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded px-2 py-1 text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                            defaultValue={card.estimatedHours || ''}
                            onBlur={(e) => {
                              const newValue = e.target.value ? parseFloat(e.target.value) : null;
                              if (newValue !== card.estimatedHours) {
                                handleFieldUpdate(card.id, 'estimatedHours', newValue);
                              } else {
                                setEditingField(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                if (newValue !== card.estimatedHours) {
                                  handleFieldUpdate(card.id, 'estimatedHours', newValue);
                                } else {
                                  setEditingField(null);
                                }
                                e.target.blur();
                              } else if (e.key === 'Escape') {
                                setEditingField(null);
                                e.target.blur();
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Est. h"
                          />
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-[var(--theme-textSecondary)]" />
                            <span>Est: {card.estimatedHours || 0}h</span>
                          </span>
                        )}
                      </div>
                      
                      {/* Spent Hours */}
                      <div 
                        className="editable-field flex items-center gap-1 cursor-pointer hover:bg-[var(--theme-surface)] rounded px-1 py-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingField(editingField?.cardId === card.id && editingField?.field === 'spentHours' ? null : { cardId: card.id, field: 'spentHours' });
                        }}
                      >
                        {editingField?.cardId === card.id && editingField?.field === 'spentHours' ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            className="w-16 text-xs bg-[var(--theme-cardBg)] border border-[var(--theme-border)] rounded px-2 py-1 text-[var(--theme-text)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]"
                            defaultValue={card.spentHours || ''}
                            onBlur={(e) => {
                              const newValue = e.target.value ? parseFloat(e.target.value) : null;
                              if (newValue !== card.spentHours) {
                                handleFieldUpdate(card.id, 'spentHours', newValue);
                              } else {
                                setEditingField(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const newValue = e.target.value ? parseFloat(e.target.value) : null;
                                if (newValue !== card.spentHours) {
                                  handleFieldUpdate(card.id, 'spentHours', newValue);
                                } else {
                                  setEditingField(null);
                                }
                                e.target.blur();
                              } else if (e.key === 'Escape') {
                                setEditingField(null);
                                e.target.blur();
                              }
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Spent h"
                          />
                        ) : (
                          <span className="flex items-center gap-1">
                            <span>Spent: {card.spentHours || 0}h</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {/* Only show "Add Task" button on "New" column */}
                {isNewColumn && (
                  <button
                    onClick={() => openNewTaskModal(column.id)}
                    className="w-full py-2 text-sm text-[var(--theme-textSecondary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-surface)] rounded-lg transition-colors border-2 border-dashed border-[var(--theme-border)]"
                  >
                    <Plus size={16} className="inline mr-1" />
                    Add Task
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <ColumnSelector
          availableColumns={allStatuses}
          selectedColumns={selectedColumns.length > 0 ? selectedColumns : (allStatuses.length > 0 ? getDefaultColumns(allStatuses) : [])}
          onSelectionChange={saveSelectedColumns}
          onClose={() => {
            setShowColumnSelector(false);
            // Board will be reloaded by saveSelectedColumns, no need to reload here
          }}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          projectName={projectName}
          onClose={() => setSelectedTaskId(null)}
          onUpdate={() => {
            // Reload board when task is updated
            loadBoard();
          }}
        />
      )}

      {showNewTaskModal && (
        <NewTaskModal
          projectName={projectName}
          statuses={allStatuses}
          priorities={priorities}
          trackers={trackers}
          members={members}
          defaultStatusId={newTaskStatusId}
          onClose={() => {
            setShowNewTaskModal(false);
            setNewTaskStatusId(null);
          }}
          onCreated={(issue) => {
            setShowNewTaskModal(false);
            setNewTaskStatusId(null);
            loadBoard();
            if (issue?.id) {
              setSelectedTaskId(issue.id);
            }
          }}
        />
      )}
    </div>
  );
}

