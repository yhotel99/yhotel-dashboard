export function IdCell({ id }: { id: string }) {
  return (
    <span className="font-mono text-sm">{id.slice(0, 8)}</span>
  );
}

