import { useEffect, useMemo, useState } from "react";
import type { Task, Status, Priority } from "./types";
import { createTask, deleteTask, getTasks, updateTask } from "./api/client";
import { Column } from "./components/Column";
import { TaskFormModal } from "./components/TaskFormModal";

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

  // ⚠️ 서버에 저장하지 않고 로컬 상태만 바꾸는 "순진한" 이동입니다.
  // TODO(P1): 낙관적 업데이트 + 실패 시 롤백 + 경쟁 상태 처리를 구현하세요.
  //   - updateTask(id, { status, version }) 로 서버에 반영
  //   - 실패(15%)하면 이전 상태로 되돌리고 사용자에게 알림
  //   - 같은 카드를 빠르게 연속 이동해도 최종 상태가 서버와 일치하도록
  const moveTask = (id: string, status: Status) => {
    const snapshot = tasks;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    console.log("🟡 보내기 전:", { id, status, 현재version: task.version });

    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));

    updateTask(id, { status, version: task.version })
      .then((updated) => {
        console.log("🟢 성공! 서버가 준 값:", {
          status: updated.status,
          새version: updated.version,
        });
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        console.log("🔴 실패! 에러:", err.status, err.message);
        setTasks(snapshot);
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
        // 성공: 임시 카드를 서버가 준 진짜 카드(진짜 id/version)로 교체
        console.log("🟢 생성 성공:", created.id);
        setTasks((prev) => prev.map((t) => (t.id === tempId ? created : t)));
      })
      .catch((err) => {
        // 실패: 임시 카드 제거
        console.log("🔴 생성 실패, 제거:", err?.status);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        alert("추가에 실패했어요.");
      });
  };

  const editTask = (
    id: string,
    patch: { title: string; priority: Priority; description?: string },
  ) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const snapshot = task;

    // 낙관적: 화면 먼저 반영
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

    updateTask(id, { ...patch, version: task.version })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
      })
      .catch((err) => {
        if (err?.status === 409) {
          const server = err.payload?.current as Task | undefined;
          if (server)
            setTasks((prev) => prev.map((t) => (t.id === id ? server : t)));
          alert("다른 곳에서 먼저 변경되었습니다. 최신 상태로 맞췄어요.");
        } else {
          setTasks((prev) => prev.map((t) => (t.id === id ? snapshot : t)));
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
    setTasks((prev) => prev.filter((t) => t.id !== id));

    deleteTask(id)
      .then(() => console.log("🟢 삭제 성공:", id))
      .catch((err) => {
        console.log("🔴 삭제 실패, 되살림:", err?.status);
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
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            title={col.title}
            status={col.status}
            tasks={byStatus[col.status]}
            onMove={moveTask}
            onEdit={(task) => setEditing(task)}
            onDelete={removeTask}
            onAdd={col.status === "todo" ? () => setShowForm(true) : undefined}
          />
        ))}
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
