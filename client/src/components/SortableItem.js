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
  
  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      {/* The Drag Handle - only shown in edit mode */}
      {props.isEditMode && (
        <div {...attributes} {...listeners} className="touch-none flex-shrink-0 cursor-grab p-2">
            <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 8a1 1 0 11-2 0 1 1 0 012 0zM5 12a1 1 0 11-2 0 1 1 0 012 0zM9 8a1 1 0 11-2 0 1 1 0 012 0zM9 12a1 1 0 11-2 0 1 1 0 012 0zM13 8a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0z"></path>
            </svg>
        </div>
      )}
      <div className="flex-grow">
        {props.children}
      </div>
    </div>
  );
}