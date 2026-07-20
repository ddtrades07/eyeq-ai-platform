import Link from 'next/link';
import { Eye } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-foreground">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Eye className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">EyeQ AI</span>
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-6 pb-16 pt-8">{children}</main>
    </div>
  );
}
