import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToParent } from './dndModifiers';
import type { ShoppingItem } from '../../types';
import { reorderItems } from '../../db/actions';
import { haptic } from '../../lib/device';
import { ItemRow } from './ItemRow';

function SortableRow(props: { item: ShoppingItem; storeMode: boolean; onEdit: (i: ShoppingItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  return (
    <ItemRow {...props} setRef={setNodeRef} dragHandle={{ ...attributes, ...listeners }}
      style={{ transform: CSS.Transform.toString(transform), transition, position: 'relative', zIndex: isDragging ? 10 : undefined, boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,.12)' : undefined }} />
  );
}

/** Ordre personnel : on attrape la poignée ⋮⋮ et on glisse (doigt ou souris). */
export function SortableItems({ items, storeMode, onEdit }: { items: ShoppingItem[]; storeMode: boolean; onEdit: (i: ShoppingItem) => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = items.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    haptic(8);
    void reorderItems(next);
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToParent]}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="overflow-hidden rounded-2xl border border-line">
          {items.map((i) => <SortableRow key={i.id} item={i} storeMode={storeMode} onEdit={onEdit} />)}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
