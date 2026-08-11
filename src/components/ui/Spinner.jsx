import clsx from "clsx";

const SIZES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-8 h-8",
};

export default function Spinner({ size = "md", className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        "inline-flex items-center justify-center space-x-1 animate-pulse",
        className
      )}
    >
      <span className={clsx("bg-current rounded-full animate-ping opacity-75 shrink-0", SIZES[size])} />
    </span>
  );
}
