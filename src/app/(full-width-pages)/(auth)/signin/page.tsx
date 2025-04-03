import SignInForm from "@/components/auth/SignInForm";
import { globalGETRateLimit } from "@/lib/request";
import { getCurrentSession } from "@/lib/sessions";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

export default async function SignIn() {
  if (!globalGETRateLimit()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">
          Too many requests. Please try again later.
        </p>
      </div>
    );
  }

  const { session } = await getCurrentSession()
  if (session !== null) {
    redirect('/')
  }

  return <SignInForm />;
}
