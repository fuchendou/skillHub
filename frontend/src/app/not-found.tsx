import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="surface-flat flex flex-col items-center gap-3 px-6 py-20 text-center">
      <p className="text-lg font-black text-slate-900">Page not found</p>
      <Link href="/" className="btn secondary">
        <ArrowLeft className="icon" />
        Back to the catalog
      </Link>
    </div>
  );
}
