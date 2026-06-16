import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-lg font-semibold text-zinc-200">Page not found</p>
      <Link href="/" className="text-sm text-sky-400 hover:underline">
        ← Back to the catalog
      </Link>
    </div>
  );
}
