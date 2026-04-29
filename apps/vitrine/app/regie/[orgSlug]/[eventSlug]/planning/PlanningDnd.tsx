"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { reassignVolunteer } from "@/app/actions/planning";

interface AssignmentLite {
  id: string;
  status: string;
  volunteer_user_id: string;
  volunteer: { full_name: string; first_name: string | null };
}

interface ShiftBucket {
  id: string;
  starts_at: string;
  ends_at: string;
  needs_count: number;
  assignments: AssignmentLite[];
  position_name: string;
  position_color: string;
}

interface Props {
  initialBuckets: ShiftBucket[];
  unassigned: AssignmentLite[];
}

/**
 * Drag&drop simplifié : on déplace une carte bénévole d'un shift à un autre.
 * Pas de cross-shift complexe — juste 1 source 1 destination par drag.
 */
export function PlanningDnd({ initialBuckets, unassigned }: Props) {
  const [buckets, setBuckets] = useState<ShiftBucket[]>(initialBuckets);
  const [pool, setPool] = useState<AssignmentLite[]>(unassigned);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findBucketByAssignmentId(aid: string): { bucket?: ShiftBucket; isPool?: boolean } {
    if (pool.some((a) => a.id === aid)) return { isPool: true };
    return { bucket: buckets.find((b) => b.assignments.some((a) => a.id === aid)) };
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Trouver la position source
    const src = findBucketByAssignmentId(activeId);
    // overId peut être : un shift id, "pool", ou un autre assignment id
    let targetShiftId: string | "pool" | null = null;
    if (overId === "pool") targetShiftId = "pool";
    else if (buckets.some((b) => b.id === overId)) targetShiftId = overId;
    else {
      // sinon, c'est un assignment dans un shift → on prend son shift
      const target = findBucketByAssignmentId(overId);
      if (target.bucket) targetShiftId = target.bucket.id;
      else if (target.isPool) targetShiftId = "pool";
    }
    if (!targetShiftId) return;

    // Optimistic update + appel server
    const assignment =
      src.bucket?.assignments.find((a) => a.id === activeId) ?? pool.find((a) => a.id === activeId);
    if (!assignment) return;

    if (targetShiftId === "pool") {
      if (src.bucket) {
        setBuckets((prev) =>
          prev.map((b) =>
            b.id === src.bucket!.id ? { ...b, assignments: b.assignments.filter((a) => a.id !== activeId) } : b,
          ),
        );
        setPool((prev) => [assignment, ...prev]);
      }
    } else {
      // Move to target shift
      if (src.bucket) {
        setBuckets((prev) =>
          prev.map((b) => {
            if (b.id === src.bucket!.id) return { ...b, assignments: b.assignments.filter((a) => a.id !== activeId) };
            if (b.id === targetShiftId) return { ...b, assignments: [...b.assignments, assignment] };
            return b;
          }),
        );
      } else {
        setPool((prev) => prev.filter((a) => a.id !== activeId));
        setBuckets((prev) =>
          prev.map((b) => (b.id === targetShiftId ? { ...b, assignments: [...b.assignments, assignment] } : b)),
        );
      }
    }

    startTransition(async () => {
      const result = await reassignVolunteer({
        assignmentId: activeId,
        targetShiftId: targetShiftId === "pool" ? null : targetShiftId,
      });
      if (!result.ok) {
        setFeedback(`❌ ${result.error}`);
      } else {
        setFeedback("✅ Affectation enregistrée");
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Pool de bénévoles non affectés */}
        <DroppablePool assignments={pool} />

        {/* Shifts en colonne */}
        <div className="space-y-3">
          {buckets.map((b) => (
            <DroppableShift key={b.id} bucket={b} />
          ))}
        </div>
      </div>

      {feedback && (
        <p className="mt-3 rounded-xl bg-brand-sand/40 px-4 py-2 text-sm">{feedback}</p>
      )}
    </DndContext>
  );
}

function DroppablePool({ assignments }: { assignments: AssignmentLite[] }) {
  const { setNodeRef, isOver } = useSortable({ id: "pool" });
  return (
    <aside
      ref={setNodeRef}
      className={`sticky top-24 self-start rounded-2xl border-2 border-dashed bg-white p-3 ${
        isOver ? "border-brand-coral" : "border-brand-ink/15"
      }`}
    >
      <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-brand-ink/60">
        Bénévoles à placer ({assignments.length})
      </h3>
      <SortableContext items={assignments.map((a) => a.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5">
          {assignments.map((a) => (
            <DraggableAssignment key={a.id} assignment={a} />
          ))}
        </ul>
      </SortableContext>
    </aside>
  );
}

function DroppableShift({ bucket }: { bucket: ShiftBucket }) {
  const { setNodeRef, isOver } = useSortable({ id: bucket.id });
  const ratio = bucket.assignments.length / bucket.needs_count;
  const ratioColor =
    ratio >= 1
      ? "bg-wellbeing-green/15 text-wellbeing-green"
      : ratio >= 0.5
      ? "bg-wellbeing-yellow/15 text-wellbeing-yellow"
      : "bg-wellbeing-red/15 text-wellbeing-red";
  return (
    <section
      ref={setNodeRef}
      className={`rounded-2xl border bg-white p-4 ${isOver ? "border-brand-coral" : "border-brand-ink/10"}`}
      style={{ borderLeft: `4px solid ${bucket.position_color}` }}
    >
      <header className="mb-2 flex items-center justify-between">
        <div>
          <h3 className="font-medium">{bucket.position_name}</h3>
          <p className="text-xs text-brand-ink/60">
            {new Date(bucket.starts_at).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            -{" "}
            {new Date(bucket.ends_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ratioColor}`}>
          {bucket.assignments.length} / {bucket.needs_count}
        </span>
      </header>
      <SortableContext
        items={bucket.assignments.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1.5">
          {bucket.assignments.map((a) => (
            <DraggableAssignment key={a.id} assignment={a} />
          ))}
        </ul>
      </SortableContext>
    </section>
  );
}

function DraggableAssignment({ assignment }: { assignment: AssignmentLite }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: assignment.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center gap-2 rounded-lg border border-brand-ink/10 bg-white px-3 py-1.5 text-sm shadow-sm hover:bg-brand-ink/[0.02] active:cursor-grabbing"
    >
      <span className="text-xs">⋮⋮</span>
      <span className="flex-1 truncate">{assignment.volunteer.full_name}</span>
      <StatusDot status={assignment.status} />
    </li>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "validated"
      ? "bg-wellbeing-green"
      : status === "refused" || status === "no_show"
      ? "bg-wellbeing-red"
      : status === "reserve"
      ? "bg-wellbeing-yellow"
      : "bg-brand-ink/30";
  return <span className={`h-2 w-2 rounded-full ${color}`} aria-label={status} />;
}
