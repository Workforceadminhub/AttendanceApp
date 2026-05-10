import clsx from "clsx";

export default function Card({ className = "", children, padding = "md", ...rest }) {
  const padCls = padding === "none" ? "" : padding === "lg" ? "p-6" : "p-4";
  return (
    <div className={clsx("bg-white rounded-lg shadow border border-ink-200", padCls, className)} {...rest}>
      {children}
    </div>
  );
}
