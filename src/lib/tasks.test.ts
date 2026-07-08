import { describe, it, expect } from "vitest";
import {
  moveTask,
  filterByTitle,
  groupByStatus,
  removeById,
  replaceTask,
  rollbackTask,
  patchTask,
} from "./tasks";
import type { Task } from "../types";

// 가짜 Task 생성 헬퍼 (기존 예시와 동일)
const make = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
  status: "todo",
  priority: "medium",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
  ...over,
});

describe("moveTask", () => {
  it("대상 태스크의 status 만 바꾸고 나머지는 그대로 둔다", () => {
    const tasks = [make("a"), make("b")];
    const next = moveTask(tasks, "a", "done");
    expect(next.find((t) => t.id === "a")?.status).toBe("done");
    expect(next.find((t) => t.id === "b")?.status).toBe("todo");
  });

  it("불변성을 지킨다 (원본 배열/객체를 변경하지 않는다)", () => {
    const tasks = [make("a")];
    const next = moveTask(tasks, "a", "done");
    expect(tasks[0].status).toBe("todo");
    expect(next).not.toBe(tasks);
  });
});

describe("filterByTitle", () => {
  it("대소문자 구분 없이 제목으로 필터링한다", () => {
    const tasks = [
      make("a", { title: "Fix login bug" }),
      make("b", { title: "Write docs" }),
    ];
    expect(filterByTitle(tasks, "FIX")).toHaveLength(1);
  });

  it("빈 검색어면 전체를 반환한다", () => {
    const tasks = [make("a"), make("b")];
    expect(filterByTitle(tasks, "   ")).toHaveLength(2);
  });
});

describe("groupByStatus", () => {
  it("status 별로 태스크를 나눈다", () => {
    const tasks = [
      make("a", { status: "todo" }),
      make("b", { status: "done" }),
      make("c", { status: "todo" }),
    ];
    const grouped = groupByStatus(tasks);
    expect(grouped.todo).toHaveLength(2);
    expect(grouped.done).toHaveLength(1);
    expect(grouped["in-progress"]).toHaveLength(0);
  });

  it("빈 배열이면 각 status 가 빈 배열이다", () => {
    const grouped = groupByStatus([]);
    expect(grouped.todo).toEqual([]);
    expect(grouped.done).toEqual([]);
    expect(grouped["in-progress"]).toEqual([]);
  });
});

describe("removeById", () => {
  it("해당 id 태스크만 제거한다", () => {
    const tasks = [make("a"), make("b")];
    const next = removeById(tasks, "a");
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("b");
  });

  it("없는 id 면 원본과 같은 길이를 반환한다", () => {
    const tasks = [make("a")];
    expect(removeById(tasks, "x")).toHaveLength(1);
  });

  it("불변성을 지킨다", () => {
    const tasks = [make("a"), make("b")];
    const next = removeById(tasks, "a");
    expect(next).not.toBe(tasks);
    expect(tasks).toHaveLength(2);
  });
});

describe("replaceTask (성공 응답 / 409 화해 반영)", () => {
  it("서버가 준 최신값(version 증가)으로 해당 카드를 교체한다", () => {
    const tasks = [make("a", { status: "done", version: 3 }), make("b")];
    const updated = make("a", { status: "done", version: 4 });
    const next = replaceTask(tasks, updated);
    expect(next.find((t) => t.id === "a")?.version).toBe(4);
    expect(next.find((t) => t.id === "b")?.version).toBe(1); // 다른 카드 영향 없음
  });
});

describe("rollbackTask (롤백)", () => {
  it("낙관적으로 바뀐 카드를 이전 스냅샷 상태로 되돌린다", () => {
    const snapshot = make("a", { status: "todo", version: 3 });
    const optimistic = [make("a", { status: "done", version: 3 }), make("b")];
    const rolled = rollbackTask(optimistic, snapshot);
    expect(rolled.find((t) => t.id === "a")?.status).toBe("todo"); // 되돌아감
    expect(rolled.find((t) => t.id === "b")?.status).toBe("todo"); // 다른 카드 영향 없음
  });

  it("불변성을 지킨다", () => {
    const snapshot = make("a", { status: "todo" });
    const optimistic = [make("a", { status: "done" })];
    const rolled = rollbackTask(optimistic, snapshot);
    expect(rolled).not.toBe(optimistic);
  });
});

describe("patchTask (수정 낙관적 반영)", () => {
  it("특정 카드에 patch 를 적용한다", () => {
    const tasks = [make("a", { title: "old", priority: "low" })];
    const next = patchTask(tasks, "a", { title: "new", priority: "high" });
    const a = next.find((t) => t.id === "a");
    expect(a?.title).toBe("new");
    expect(a?.priority).toBe("high");
  });

  it("다른 카드는 건드리지 않는다", () => {
    const tasks = [make("a", { title: "old" }), make("b", { title: "keep" })];
    const next = patchTask(tasks, "a", { title: "new" });
    expect(next.find((t) => t.id === "b")?.title).toBe("keep");
  });
});
