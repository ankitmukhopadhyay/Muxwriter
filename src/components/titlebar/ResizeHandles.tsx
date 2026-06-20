import { appWindow } from "../../lib/platform";

type ResizeDirection =
  | "North"
  | "South"
  | "East"
  | "West"
  | "NorthEast"
  | "NorthWest"
  | "SouthEast"
  | "SouthWest";

const HANDLES: { dir: ResizeDirection; className: string }[] = [
  { dir: "North", className: "resize resize--n" },
  { dir: "South", className: "resize resize--s" },
  { dir: "East", className: "resize resize--e" },
  { dir: "West", className: "resize resize--w" },
  { dir: "NorthEast", className: "resize resize--ne" },
  { dir: "NorthWest", className: "resize resize--nw" },
  { dir: "SouthEast", className: "resize resize--se" },
  { dir: "SouthWest", className: "resize resize--sw" },
];

/**
 * Invisible edge and corner handles that restore window resizing on a
 * frameless window. Each starts a native resize drag in its direction.
 * No ops in a plain browser.
 */
export function ResizeHandles() {
  const start = (dir: ResizeDirection) => (e: React.MouseEvent) => {
    e.preventDefault();
    void appWindow()?.startResizeDragging(dir);
  };

  return (
    <>
      {HANDLES.map(({ dir, className }) => (
        <div
          key={dir}
          className={className}
          onMouseDown={start(dir)}
          aria-hidden
        />
      ))}
    </>
  );
}
