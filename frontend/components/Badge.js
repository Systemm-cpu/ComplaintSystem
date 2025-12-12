export default function Badge({ tone = "gray", children }) {
  const baseStyle = {
    display: "inline-block",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "white",
    textTransform: "capitalize",
  };

  let style = {};

  switch (tone) {
    case "green": // Closed
      style = { background: "#0C512F" };
      break;
    case "yellow": // In Progress
      style = { background: "#D97706" };
      break;
    case "blue": // Forwarded
      style = { background: "#2563EB" };
      break;
    case "red": // Error
      style = { background: "#DC2626" };
      break;
    default: // Pending / Unknown
      style = { background: "#6B7280" };
  }

  return <span style={{ ...baseStyle, ...style }}>{children}</span>;
}
