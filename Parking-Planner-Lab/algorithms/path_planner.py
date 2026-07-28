from __future__ import annotations

from heapq import heappop, heappush
from math import hypot
from typing import Iterable


Point = tuple[int, int]


def neighbors(point: Point, width: int, height: int) -> Iterable[Point]:
    x, y = point
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < width and 0 <= ny < height:
            yield nx, ny


def astar(width: int, height: int, start: Point, goal: Point, obstacles: set[Point]) -> list[Point]:
    queue: list[tuple[float, Point]] = []
    heappush(queue, (0, start))
    came_from: dict[Point, Point | None] = {start: None}
    cost_so_far: dict[Point, float] = {start: 0}

    while queue:
        _, current = heappop(queue)
        if current == goal:
            break

        for nxt in neighbors(current, width, height):
            if nxt in obstacles:
                continue
            step = hypot(nxt[0] - current[0], nxt[1] - current[1])
            new_cost = cost_so_far[current] + step
            if nxt not in cost_so_far or new_cost < cost_so_far[nxt]:
                cost_so_far[nxt] = new_cost
                priority = new_cost + hypot(goal[0] - nxt[0], goal[1] - nxt[1])
                heappush(queue, (priority, nxt))
                came_from[nxt] = current

    if goal not in came_from:
        return []

    path = [goal]
    current = goal
    while came_from[current] is not None:
        current = came_from[current]  # type: ignore[assignment]
        path.append(current)
    return list(reversed(path))


def simplify(path: list[Point]) -> list[Point]:
    if len(path) <= 2:
        return path
    simplified = [path[0]]
    last_dir: tuple[int, int] | None = None
    for prev, current in zip(path, path[1:]):
        direction = (current[0] - prev[0], current[1] - prev[1])
        if last_dir is not None and direction != last_dir:
            simplified.append(prev)
        last_dir = direction
    simplified.append(path[-1])
    return simplified


def demo_obstacles() -> set[Point]:
    obstacles: set[Point] = set()
    for x in range(9, 15):
        for y in range(5, 10):
            obstacles.add((x, y))
    for x in range(20, 25):
        for y in range(8, 14):
            obstacles.add((x, y))
    return obstacles


def main() -> None:
    width, height = 30, 18
    start = (2, 14)
    goal = (26, 4)
    path = astar(width, height, start, goal, demo_obstacles())
    print(f"raw_path_points={len(path)}")
    print(f"simplified_points={simplify(path)}")


if __name__ == "__main__":
    main()
