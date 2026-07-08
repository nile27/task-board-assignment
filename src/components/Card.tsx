import type { Task } from "../types";

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

interface Props {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export function Card({ task, onDelete, onEdit }: Props) {
  return (
    <article
      className={`card priority-${task.priority}`}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", task.id)}
    >
      <div className="card-header">
        <div className="card-title">{task.title}</div>
        <div className="card-actions">
          <button
            type="button"
            className="card-edit"
            aria-label="수정"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          >
            ✎
          </button>
          <button
            type="button"
            className="card-delete"
            aria-label="삭제"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          >
            ×
          </button>
        </div>
      </div>
      <div className="card-meta">
        <span className={`badge badge-${task.priority}`}>
          {PRIORITY_LABEL[task.priority]}
        </span>
        <span className="date">
          {new Date(task.createdAt).toLocaleDateString()}
        </span>
      </div>
    </article>
  );
}
