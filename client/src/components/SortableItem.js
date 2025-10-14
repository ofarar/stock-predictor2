// src/components/SortableItem.js
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function SortableItem(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  
  // This component adds the drag handle and manages the drag state
  return (
    <div ref={setNodeRef} style={style} className="relative flex items-center">
      {/* The Drag Handle (6 dots icon) */}
      <div 
        {...attributes} 
        {...listeners} 
        className="touch-none flex-shrink-0 cursor-grab p-2"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </div>
      
      {/* Your original WatchlistStockCard */}
      <div className="flex-grow">
        {props.children}
      </div>
    </div>
  );
}