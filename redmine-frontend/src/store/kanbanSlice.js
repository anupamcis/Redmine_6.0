const initialState = { board: null, loading: false };

export const fetchBoardSuccess = (payload) => ({ type: 'kanban/fetchSuccess', payload });

export const moveCardOptimistic = (cardId, fromColumnId, toColumnId) => ({
  type: 'kanban/moveCardOptimistic',
  payload: { cardId, fromColumnId, toColumnId }
});

export const revertCardMove = (cardId, fromColumnId, toColumnId) => ({
  type: 'kanban/revertCardMove',
  payload: { cardId, fromColumnId, toColumnId }
});

export const updateCardField = (cardId, field, value, metadata = {}) => ({
  type: 'kanban/updateCardField',
  payload: { cardId, field, value, metadata }
});

export default function kanbanReducer(state = initialState, action) {
  switch(action.type) {
    case 'kanban/fetchSuccess': 
      return { ...state, board: action.payload };
    
    case 'kanban/moveCardOptimistic': {
      if (!state.board || !state.board.columns) return state;
      
      const { cardId, fromColumnId, toColumnId } = action.payload;
      const columns = [...state.board.columns];
      
      // Find source and target columns
      const fromColumn = columns.find(col => col.id === fromColumnId);
      const toColumn = columns.find(col => col.id === toColumnId);
      
      if (!fromColumn || !toColumn) return state;
      
      // Find the card in source column
      const cardIndex = fromColumn.cards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) return state;
      
      // Remove card from source column
      const card = fromColumn.cards[cardIndex];
      const newFromCards = [...fromColumn.cards];
      newFromCards.splice(cardIndex, 1);
      
      // Add card to target column
      const newToCards = [...toColumn.cards, card];
      
      // Update columns
      const newColumns = columns.map(col => {
        if (col.id === fromColumnId) {
          return { ...col, cards: newFromCards };
        }
        if (col.id === toColumnId) {
          return { ...col, cards: newToCards };
        }
        return col;
      });
      
      return {
        ...state,
        board: { ...state.board, columns: newColumns }
      };
    }
    
    case 'kanban/revertCardMove': {
      if (!state.board || !state.board.columns) return state;
      
      const { cardId, fromColumnId, toColumnId } = action.payload;
      const columns = [...state.board.columns];
      
      // Find source and target columns
      const fromColumn = columns.find(col => col.id === fromColumnId);
      const toColumn = columns.find(col => col.id === toColumnId);
      
      if (!fromColumn || !toColumn) return state;
      
      // Find the card in target column
      const cardIndex = toColumn.cards.findIndex(card => card.id === cardId);
      if (cardIndex === -1) return state;
      
      // Remove card from target column
      const card = toColumn.cards[cardIndex];
      const newToCards = [...toColumn.cards];
      newToCards.splice(cardIndex, 1);
      
      // Add card back to source column
      const newFromCards = [...fromColumn.cards, card];
      
      // Update columns
      const newColumns = columns.map(col => {
        if (col.id === fromColumnId) {
          return { ...col, cards: newFromCards };
        }
        if (col.id === toColumnId) {
          return { ...col, cards: newToCards };
        }
        return col;
      });
      
      return {
        ...state,
        board: { ...state.board, columns: newColumns }
      };
    }
    
    case 'kanban/updateCardField': {
      if (!state.board || !state.board.columns) return state;
      
      const { cardId, field, value, metadata } = action.payload;
      const columns = [...state.board.columns];
      
      // Find the column containing the card
      let updated = false;
      const newColumns = columns.map(col => {
        const cardIndex = col.cards.findIndex(card => card.id === cardId);
        if (cardIndex === -1) return col;
        
        updated = true;
        const card = { ...col.cards[cardIndex] };
        
        // Update the specific field
        if (field === 'assignee') {
          if (value) {
            // Find the member from metadata
            const member = metadata.member || { id: value, name: metadata.memberName || 'Unknown' };
            card.assignee = { id: member.id, name: member.name };
          } else {
            card.assignee = null;
          }
        } else if (field === 'dueDate') {
          card.dueDate = value || null;
        } else if (field === 'priority') {
          if (value) {
            // Find the priority from metadata
            const priority = metadata.priority || { id: parseInt(value), name: metadata.priorityName || 'Unknown' };
            card.priority = priority.name;
            card.priorityId = priority.id;
          } else {
            card.priority = null;
            card.priorityId = null;
          }
        } else if (field === 'estimatedHours') {
          card.estimatedHours = value !== null && value !== undefined ? parseFloat(value) : null;
        } else if (field === 'spentHours') {
          card.spentHours = value !== null && value !== undefined ? parseFloat(value) : null;
        }
        
        const newCards = [...col.cards];
        newCards[cardIndex] = card;
        
        return { ...col, cards: newCards };
      });
      
      if (!updated) return state;
      
      return {
        ...state,
        board: { ...state.board, columns: newColumns }
      };
    }
    
    default: 
      return state;
  }
}

