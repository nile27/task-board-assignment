import type { Task, Status } from "../types";
import { Card } from "./Card";

interface Props {
  title: string;
  status: Status;
  tasks: Task[];
  onMove: (id: string, status: Status) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAdd?: () => void;
}

export function Column({
  title,
  status,
  tasks,
  onMove,
  onDelete,
  onAdd,
  onEdit,
}: Props) {
  return (
    <section
      className="column"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        const id = e.dataTransfer.getData("text/plain");
        if (id) onMove(id, status);
      }}
    >
      <h2 className="column-title">
        <span>
          {title} <span className="count">{tasks.length}</span>
        </span>
        {onAdd && (
          <button
            type="button"
            className="column-add"
            aria-label="할 일 추가"
            onClick={onAdd}
          >
            +
          </button>
        )}
      </h2>
      <div className="column-body">
        {tasks.map((t) => (
          <Card key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
