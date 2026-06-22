/**
 * UI component barrel — re-export the shared primitives so consumers can do:
 *   import { Button, Card, Spinner } from "../components/ui";
 *
 * Add components incrementally as you spot duplicated patterns. Keep this
 * file small — components belong in their own files; this just re-exports.
 */
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as Spinner } from "./Spinner";
export { default as Skeleton, SkeletonRow, SkeletonCard } from "./Skeleton";
export { default as Tag } from "./Tag";
export { default as Stat } from "./Stat";
