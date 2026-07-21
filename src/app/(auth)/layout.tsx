import Link from 'next/link';
import { EyeQLogo } from '@/components/brand/eyeq-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="inline-flex items-center" aria-label="EyeQ home">
          <EyeQLogo size="md" variant="mark" priority />
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col px-6 pb-16 pt-8">{children}</main>
    </div>
  );
}
