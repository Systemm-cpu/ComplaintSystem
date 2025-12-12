export default function Button({ children, variant = "primary", disabled, ...rest }) {
  const baseStyle = {
    padding: "0.45rem 1rem",
    borderRadius: "6px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    transition: "0.2s",
    border: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.35rem",
  };

  let style = {};

  if (variant === "primary") {
    style = {
      background: disabled ? "#9ca3af" : "#0C512F",
      color: "white",
    };
  }

  if (variant === "ghost") {
    style = {
      background: "white",
      border: "2px solid #0C512F",
      color: "#0C512F",
    };
  }

  if (variant === "danger") {
    style = {
      background: disabled ? "#fca5a5" : "#dc2626",
      color: "white",
    };
  }

  return (
    <button disabled={disabled} style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </button>
  );
}
