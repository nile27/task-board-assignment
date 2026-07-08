import { useEffect, useMemo, useState } from "react";
import type { Task, Status } from "./types";
import { deleteTask, getTasks, updateTask } from "./api/client";
import { Column } from "./components/Column";

const COLUMNS: { status: Status; title: string }[] = [
  { status: "todo", title: "To Do" },
  { status: "in-progress", title: "In Progress" },
  { status: "done", title: "Done" },
];

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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
    <div className="board">
      {COLUMNS.map((col) => (
        <Column
          key={col.status}
          title={col.title}
          status={col.status}
          tasks={byStatus[col.status]}
          onMove={moveTask}
          onDelete={removeTask}
        />
      ))}
    </div>
  );
}
