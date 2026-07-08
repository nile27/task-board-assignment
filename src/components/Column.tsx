import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const ESTIMATED_CARD_HEIGHT = 92;

export function Column({
  title,
  status,
  tasks,
  onMove,
  onDelete,
  onAdd,
  onEdit,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 8,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

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

      {/* 스크롤 컨테이너 */}
      <div className="column-body" ref={parentRef}>
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: "relative",
            width: "100%",
          }}
        >
          {/* 화면에 보이는 범위의 카드만 실제로 렌더 */}
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const t = tasks[virtualRow.index];
            return (
              <div
                key={t.id}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement} // ← 실제 높이 측정용
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div style={{ paddingBottom: 8 }}>
                  <Card task={t} onEdit={onEdit} onDelete={onDelete} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
