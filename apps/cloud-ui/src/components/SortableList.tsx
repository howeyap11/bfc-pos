"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DRAG_HANDLE = (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

export type SortableItemRenderProps<T> = {
  item: T;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  isDragging: boolean;
};

export type SortableListProps<T extends { id: string; sortOrder?: number }> = {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  getId: (item: T) => string;
  onReorder: (order: { id: string; sortOrder: number }[]) => Promise<unknown>;
  renderItem: (props: SortableItemRenderProps<T>) => React.ReactNode;
  strategy?: SortingStrategy;
  listClassName?: string;
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
};

function SortableRow<T extends { id: string; sortOrder?: number }>({
  item,
  getId,
  renderItem,
}: {
  item: T;
  getId: (item: T) => string;
  renderItem: (props: SortableItemRenderProps<T>) => React.ReactNode;
}) {
  const id = getId(item);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.3)" : undefined,
  };

  const dragHandleProps = {
    ...attributes,
    ...listeners,
    role: "button" as const,
    "aria-label": "Drag to reorder",
    tabIndex: 0,
    style: { cursor: "grab", touchAction: "none", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" },
  };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem({ item, dragHandleProps, isDragging })}
    </div>
  );
}

export function SortableList<T extends { id: string; sortOrder?: number }>({
  items,
  setItems,
  getId,
  onReorder,
  renderItem,
  strategy = verticalListSortingStrategy,
  listClassName = "space-y-2",
  onSuccess,
  onError,
}: SortableListProps<T>) {
  const [isReordering, setIsReordering] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedItems = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const itemIds = sortedItems.map((i) => getId(i));

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = itemIds.indexOf(active.id as string);
      const newIndex = itemIds.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sortedItems, oldIndex, newIndex);
      const prevItems = [...sortedItems];
      const order = reordered.map((item, idx) => ({
        id: getId(item),
        sortOrder: idx,
      }));

      setItems(
        reordered.map((item, idx) => ({
          ...item,
          sortOrder: idx,
        })) as T[]
      );
      setIsReordering(true);

      try {
        await onReorder(order);
        onSuccess?.("Reordered");
      } catch (err) {
        setItems(prevItems);
        const msg = err instanceof Error ? err.message : "Failed to reorder";
        onError?.(msg);
      } finally {
        setIsReordering(false);
      }
    },
    [sortedItems, itemIds, getId, onReorder, setItems, onSuccess, onError]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={strategy} disabled={isReordering}>
        <div className={listClassName}>
          {sortedItems.map((item) => (
            <SortableRow
              key={getId(item)}
              item={item}
              getId={getId}
              renderItem={renderItem}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/** Renders the standard drag handle icon. Attach dragHandleProps to a wrapper. */
export function DragHandle({
  dragHandleProps,
  className = "",
}: {
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      {...dragHandleProps}
      className={`flex shrink-0 cursor-grab items-center justify-center rounded text-gray-400 hover:bg-white/10 hover:text-gray-300 active:cursor-grabbing ${className}`}
    >
      {DRAG_HANDLE}
    </div>
  );
}
