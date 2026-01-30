export function Queen({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2L14.5 8L21 8L16 12L18 19H6L8 12L3 8L9.5 8L12 2Z" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="6" cy="8" r="1.5" />
      <circle cx="18" cy="8" r="1.5" />
    </svg>
  );
}
