export interface Position {
  row: number;
  col: number;
}

export interface Region {
  id: number;
  color: string;
  cells: Position[];
}

export interface Puzzle {
  id: string;
  name: string;
  width: number;
  height: number;
  regions: Region[];
  solution: Position[];
}

export interface Cell {
  position: Position;
  regionId: number;
  regionColor: string;
}
