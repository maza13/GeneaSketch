export function buildLayoutClassName(leftCollapsed: boolean, rightCollapsed: boolean): string {
  const classes = ["layout"];
  if (leftCollapsed) classes.push("layout--left-collapsed");
  if (rightCollapsed) classes.push("layout--right-collapsed");
  if (leftCollapsed && rightCollapsed) classes.push("layout--canvas-only");
  return classes.join(" ");
}

