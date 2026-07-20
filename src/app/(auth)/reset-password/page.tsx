import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = { title: 'Reset password' };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            If an account exists for that email, a password reset link has been sent.
            Follow the link in the email to set a new password.
          </p>
          <Link href="/login" className="underline">
            Return to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
