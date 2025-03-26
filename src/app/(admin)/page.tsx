import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/sessions";

export const metadata: Metadata = {
  title:
    "Next.js E-commerce Dashboard | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Home for TailAdmin Dashboard Template",
};

export default async function Ecommerce() {
  const { session, user } = await getCurrentSession();

  if (session === null) {
    redirect('/signin');
  }
  if (!user.emailVerified) {
    redirect('/verify-email');
  }
  if (!user.registered2FA) {
    redirect('/2fa/setup');
  }
  if (!session.twoFactorVerified) {
    redirect('/2fa');
  }

  return redirect('/revenue-new-sales');
}
