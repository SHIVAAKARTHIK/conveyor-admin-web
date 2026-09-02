const COLORS: Record<string, string> = {
  // delivery / prescription statuses
  pending: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  preparing: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  verifying: "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50",
  verified: "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50",
  dispatched: "bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-blue-50",
  in_transit: "bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-blue-50",
  arrived: "bg-indigo-200 text-indigo-900 dark:bg-indigo-700 dark:text-indigo-50",
  delivered: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-50",
  confirmed: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-50",
  failed: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-50",
  // conveyor
  idle: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  running: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-50",
  jammed: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-50",
  // alerts
  open: "bg-red-200 text-red-900 dark:bg-red-700 dark:text-red-50",
  acknowledged: "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50",
  resolved: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-50",
  // consultations
  requested: "bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50",
  accepted: "bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-blue-50",
  completed: "bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-50",
};

export function Badge({ value }: { value: string }) {
  const cls = COLORS[value] ?? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{value.replace(/_/g, " ")}</span>;
}
