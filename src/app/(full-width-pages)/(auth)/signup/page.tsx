import SignUpForm from "@/components/auth/SignUpForm";
import { globalGETRateLimit } from "@/lib/request";
import { getCurrentSession } from "@/lib/sessions";
import { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Next.js SignUp Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js SignUp Page TailAdmin Dashboard Template",
  // other metadata
};

export default async function SignUp() {
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

  return <SignUpForm />;
}
