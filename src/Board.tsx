import { useEffect, useMemo, useRef, useState } from "react";
import type { Task, Status, Priority } from "./types";
import { createTask, deleteTask, getTasks, updateTask } from "./api/client";
import { Column } from "./components/Column";
import { TaskFormModal } from "./components/TaskFormModal";

import { replaceTask, rollbackTask, removeById, patchTask } from "./lib/tasks";

const COLUMNS: { status: Status; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const inFlight = useRef<Set<string>>(new Set()); // 지금 요청 중인 카드들

  const load = () => {
    setLoading(true);
    setIsError(false); // 재시도 시 이전 에러 초기화
    getTasks()
      .then((data) => setTasks(data))
      .catch(() => setIsError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const moveTask = (id: string, status: Status) => {
    if (inFlight.current.has(id)) return; // 요청 중 -> 새로운 요청 무시

    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    inFlight.current.add(id); // 카드 요청 시작함

    // 낙관적: 화면 먼저 반영
    setTasks((prev) => patchTask(prev, id, { status }));

    updateTask(id, { status, version: task.version })
      .then((updated) => {
        // 성공: 서버 최신값(version↑)으로 교체
        setTasks((prev) => replaceTask(prev, updated));
      })
      .catch((err) => {
        if (err?.status === 409) {
          const server = err.payload?.current as Task | undefined;
          if (server) setTasks((prev) => replaceTask(prev, server));
          alert("다른 곳에서 먼저 변경되었습니다. 최신 상태로 맞췄어요.");
        } else {
          // 실패: 해당 카드만 이전 상태로 롤백 (전체 배열이 아니라 그 카드만)
          setTasks((prev) => rollbackTask(prev, task));
          alert("저장에 실패했어요. 되돌립니다.");
        }
      })
      .finally(() => {
        inFlight.current.delete(id); // "요청 끝남" 표시 해제
      });
  };

  const addTask = (input: {
    title: string;
    priority: Priority;
    description?: string;
  }) => {
    // 임시 id로 카드를 먼저 만들어 화면에 낙관적으로 추가
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticTask: Task = {
      id: tempId,
      title: input.title,
      description: input.description,
      status: "todo", // 생성은 todo 고정
      priority: input.priority,
      createdAt: now,
      updatedAt: now,
      version: 0, // 임시값 (서버가 진짜 버전 줌)
    };

    // 낙관적: 화면에 먼저 추가
    setTasks((prev) => [...prev, optimisticTask]);

    createTask({
      title: input.title,
      priority: input.priority,
      description: input.description,
      status: "todo",
    })
      .then((created) => {
        // 성공: 임시 카드를 서버가 준 진짜 카드로 교체
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      })
      .catch(() => {
        // 실패: 임시 카드 제거
        setTasks((prev) => removeById(prev, tempId));
        alert("추가에 실패했어요.");
      });
  };

  const editTask = (
    id: string,
    patch: { title: string; priority: Priority; description?: string },
  ) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // 낙관적: 화면 먼저 반영
    setTasks((prev) => patchTask(prev, id, patch));

    updateTask(id, { ...patch, version: task.version })
      .then((updated) => {
        setTasks((prev) => replaceTask(prev, updated));
      })
      .catch((err) => {
        if (err?.status === 409) {
          const server = err.payload?.current as Task | undefined;
          if (server) setTasks((prev) => replaceTask(prev, server));
          alert("다른 곳에서 먼저 변경되었습니다. 최신 상태로 맞췄어요.");
        } else {
          // 실패: 해당 카드만 이전 상태로 롤백
          setTasks((prev) => rollbackTask(prev, task));
          alert("수정에 실패했어요. 되돌립니다.");
        }
      });
  };

  const removeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    // 확인 다이얼로그 (P1-5 필수)
    if (!window.confirm(`"${task.title}" 태스크를 삭제할까요?`)) return;

    const snapshot = task; // 롤백용

    // 낙관적: 화면에서 먼저 제거
    setTasks((prev) => removeById(prev, id));

    deleteTask(id).catch(() => {
      // 실패: 되살림 (원래 위치 정보는 없어 끝에 재삽입)
      setTasks((prev) => [...prev, snapshot]);
      alert("삭제에 실패했어요. 되돌립니다.");
    });
  };

  const byStatus = useMemo(() => {
    const map: Record<Status, Task[]> = {
      todo: [],
      "in-progress": [],
      done: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  if (loading) return <p className="hint">불러오는 중…</p>;
  if (isError)
    return (
      <div className="hint">
        <p>불러오기에 실패했어요.</p>
        <button onClick={load}>다시 시도</button>
      </div>
    );
  return (
    <>
      <div className="board">
        {COLUMNS.map((col) => {
          if (tasks.length === 0) {
            return (
              <section className="errorColumn" key={col.status}>
                <h2 className="column-title">
                  {col.title} <span className="count">{tasks.length}</span>
                </h2>
                <div className="hintContainer">
                  <p className="hint">등록한 작업이 없습니다.</p>
                </div>
              </section>
            );
          }
          return (
            <Column
              key={col.status}
              title={col.title}
              status={col.status}
              tasks={byStatus[col.status]}
              onMove={moveTask}
              onEdit={(task) => setEditing(task)}
              onDelete={removeTask}
              onAdd={
                col.status === "todo" ? () => setShowForm(true) : undefined
              }
            />
          );
        })}
      </div>

      {/* 생성 모달 */}
      {showForm && (
        <TaskFormModal onClose={() => setShowForm(false)} onSubmit={addTask} />
      )}

      {/* 수정 모달 */}
      {editing && (
        <TaskFormModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={(patch) => editTask(editing.id, patch)}
        />
      )}
    </>
  );
}
