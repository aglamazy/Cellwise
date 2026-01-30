import { Puzzle } from "@/types/game";

// 5x5 puzzle layout:
// A A B B B
// A A B C C
// A D D C C
// D D E E C
// D E E E E

export const PUZZLE_1: Puzzle = {
  id: "puzzle-001",
  name: "Starter",
  size: 5,
  regions: [
    {
      id: 0,
      color: "#ef4444", // red
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 0 },
        { row: 1, col: 1 },
        { row: 2, col: 0 },
      ],
    },
    {
      id: 1,
      color: "#3b82f6", // blue
      cells: [
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 1, col: 2 },
      ],
    },
    {
      id: 2,
      color: "#22c55e", // green
      cells: [
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 4 },
      ],
    },
    {
      id: 3,
      color: "#eab308", // yellow
      cells: [
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 3, col: 0 },
        { row: 3, col: 1 },
        { row: 4, col: 0 },
      ],
    },
    {
      id: 4,
      color: "#a855f7", // purple
      cells: [
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 4, col: 1 },
        { row: 4, col: 2 },
        { row: 4, col: 3 },
        { row: 4, col: 4 },
      ],
    },
  ],
  solution: [
    { row: 0, col: 3 },
    { row: 1, col: 0 },
    { row: 2, col: 2 },
    { row: 3, col: 4 },
    { row: 4, col: 1 },
  ],
};
