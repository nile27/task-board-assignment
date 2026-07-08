import type { Task, Status } from "../types";

/**
 * 순수 함수 예시 — 이런 로직을 테스트로 검증하세요. (tasks.test.ts 참고)
 * 필요하면 자유롭게 수정/삭제해도 됩니다.
 */
export function moveTask(tasks: Task[], id: string, status: Status): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, status } : t));
}

export function filterByTitle(tasks: Task[], query: string): Task[] {
  const q = query.trim().toLowerCase();
  if (!q) return tasks;
  return tasks.filter((t) => t.title.toLowerCase().includes(q));
}

export function groupByStatus(tasks: Task[]): Record<Status, Task[]> {
  const map: Record<Status, Task[]> = { todo: [], "in-progress": [], done: [] };
  for (const t of tasks) map[t.status].push(t);
  return map;
}

// 삭제 (낙관적) — 해당 id 제거
export function removeById(tasks: Task[], id: string): Task[] {
  return tasks.filter((t) => t.id !== id);
}

// 특정 카드를 새 값으로 교체 (성공 응답 반영 / 409 화해에 쓰는 로직)
export function replaceTask(tasks: Task[], updated: Task): Task[] {
  return tasks.map((t) => (t.id === updated.id ? updated : t));
}

// 롤백 — 특정 카드를 스냅샷(이전 상태)으로 되돌림
export function rollbackTask(tasks: Task[], snapshot: Task): Task[] {
  return tasks.map((t) => (t.id === snapshot.id ? snapshot : t));
}

// 부분 수정 (낙관적) — 특정 카드에 patch 적용
export function patchTask(
  tasks: Task[],
  id: string,
  patch: Partial<Task>,
): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
}
