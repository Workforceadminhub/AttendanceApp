import clsx from "clsx";

const VARIANTS = {
 primary: "bg-ink-900 text-white hover:bg-ink-800 focus:ring-ink-900/10",
 secondary: "bg-ink-200 text-ink-800 hover:bg-ink-300 focus:ring-ink-400",
 danger: "bg-brick text-white hover:bg-brick/80 focus:ring-red-500",
 ghost: "bg-transparent text-ink-700 hover:bg-cream-200",
};

const SIZES = {
 sm: "px-3 py-1.5 text-sm",
 md: "px-4 py-2 text-sm",
 lg: "px-5 py-2.5 text-base",
};

export default function Button({
 variant = "primary",
 size = "md",
 loading = false,
 disabled = false,
 className = "",
 children,
 ...rest
}) {
 return (
 <button
 type="button"
 disabled={disabled || loading}
 className={clsx(
 "inline-flex items-center justify-center rounded-md font-medium",
 "focus:outline-none focus:ring-2 focus:ring-offset-1",
 "disabled:opacity-60 disabled:cursor-not-allowed",
 VARIANTS[variant],
 SIZES[size],
 className
 )}
 {...rest}
 >
 {loading ? (
 <span className="inline-block w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
 ) : null}
 {children}
 </button>
 );
}
