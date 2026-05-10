import clsx from "clsx";

const SIZES = { xs: "w-3 h-3", sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" };

export default function Spinner({ size = "md", className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        "inline-block border-2 border-current border-t-transparent rounded-full animate-spin",
        SIZES[size],
        className
      )}
    />
  );
}
