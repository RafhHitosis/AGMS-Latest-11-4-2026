import { useCallback, useEffect, useRef, useState } from "react";

export default function useReadModeCellSelection(enabled) {
  const containerRef = useRef(null);
  const [selection, setSelection] = useState({ enabled, cell: null });
  const activeCell = selection.enabled === enabled ? selection.cell : null;

  const selectCell = useCallback((cell) => {
    setSelection({
      enabled,
      cell: { rowIndex: cell.parentElement.rowIndex, columnIndex: cell.cellIndex },
    });
    cell.focus();
  }, [enabled]);

  const handleCellClick = useCallback((event) => {
    if (!enabled || !(event.target instanceof Element)) return;

    const cell = event.target.closest("td");
    if (!cell || !cell.closest("table") || !containerRef.current?.contains(cell)) return;

    selectCell(cell);
  }, [enabled, selectCell]);

  const handleCellKeyDown = useCallback((event) => {
    if (!enabled || !activeCell) return;

    const direction = {
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
    }[event.key];
    if (!direction) return;

    const table = containerRef.current?.querySelector("table");
    const currentRow = table?.rows[activeCell.rowIndex];
    if (!currentRow) return;

    let nextCell;
    if (direction[0] === 0) {
      for (
        let column = activeCell.columnIndex + direction[1];
        column >= 0 && column < currentRow.cells.length;
        column += direction[1]
      ) {
        if (currentRow.cells[column].tagName === "TD") {
          nextCell = currentRow.cells[column];
          break;
        }
      }
    } else {
      for (
        let rowIndex = activeCell.rowIndex + direction[0];
        rowIndex >= 0 && rowIndex < table.rows.length;
        rowIndex += direction[0]
      ) {
        const row = table.rows[rowIndex];
        const candidate = row.cells[activeCell.columnIndex];
        if (candidate?.tagName === "TD") {
          nextCell = candidate;
          break;
        }
      }
    }

    if (!nextCell) return;

    event.preventDefault();
    selectCell(nextCell);
  }, [activeCell, enabled, selectCell]);

  useEffect(() => {
    const table = containerRef.current?.querySelector("table");
    const cells = table?.querySelectorAll("td");
    if (!cells) return;

    cells.forEach((cell) => {
      cell.classList.remove(
        "grade-read-row-selected",
        "grade-read-column-selected",
        "grade-read-cell-active",
      );
      if (enabled) {
        cell.tabIndex = -1;
      } else {
        cell.removeAttribute("tabindex");
      }
    });

    if (!enabled || !activeCell) return;

    const activeRow = table.rows[activeCell.rowIndex];
    const selectedCell = activeRow?.cells[activeCell.columnIndex];
    if (!selectedCell || selectedCell.tagName !== "TD") return;

    Array.from(activeRow.cells).forEach((cell) => {
      if (cell.tagName === "TD") cell.classList.add("grade-read-row-selected");
    });

    Array.from(table.rows).forEach((row) => {
      const cell = row.cells[activeCell.columnIndex];
      if (cell?.tagName === "TD") cell.classList.add("grade-read-column-selected");
    });

    selectedCell.classList.add("grade-read-cell-active");
    selectedCell.tabIndex = 0;
  }, [enabled, activeCell]);

  return { containerRef, handleCellClick, handleCellKeyDown };
}
