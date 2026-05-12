"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const initialMessage =
    searchParams.get("reason") === "unauthorized"
      ? "This account is signed in, but it does not have backend access."
      : null;

  useEffect(() => {
    let active = true;

    const checkExistingSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        return;
      }

      const { data: adminRecord } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminRecord) {
        router.replace("/admin");
        router.refresh();
      }
    };

    void checkExistingSession();

    return () => {
      active = false;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Login succeeded, but the session could not be verified.");
      setSubmitting(false);
      return;
    }

    const { data: adminRecord, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !adminRecord) {
      await supabase.auth.signOut();
      setMessage("This account does not have backend access yet.");
      setSubmitting(false);
      return;
    }

    const nextPath = searchParams.get("next");
    const destination = nextPath?.startsWith("/admin") ? nextPath : "/admin";

    router.replace(destination);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#101010] px-6 py-10 text-[#f0f1f2]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="grid w-full overflow-hidden border border-[#2a2a2a] bg-[#141414] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-[#2a2a2a] bg-[radial-gradient(circle_at_top_left,_rgba(204,255,0,0.16),_transparent_42%),_#111111] p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-14">
            <Link href="/" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-[#ccff00]">
              NexaDesignLab
            </Link>
            <div className="mt-10 max-w-xl space-y-6">
              <span className="inline-flex items-center gap-2 border border-[#2f3810] bg-[#ccff00]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.25em] text-[#ccff00]">
                Backend Access
              </span>
              <h1 className="text-4xl font-black uppercase tracking-tighter text-white sm:text-5xl">
                Admin Login
              </h1>
              <p className="max-w-lg text-sm leading-7 text-[#a8abad] sm:text-base">
                Sign in with the Supabase auth account that has been granted admin access. This protects the backend UI and admin write operations.
              </p>
            </div>
          </div>

          <div className="p-8 sm:p-10 lg:p-14">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#808080]">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border border-[#333333] bg-[#121212] px-4 py-4 text-sm text-white outline-none transition-colors placeholder:text-[#5b5b5b] focus:border-[#ccff00]"
                  placeholder="admin@nexadesignlab.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#808080]">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border border-[#333333] bg-[#121212] px-4 py-4 text-sm text-white outline-none transition-colors placeholder:text-[#5b5b5b] focus:border-[#ccff00]"
                  placeholder="Enter your admin password"
                  required
                />
              </div>

              {message ?? initialMessage ? (
                <div className="border border-[#5b2d2d] bg-[#211515] px-4 py-3 text-sm text-[#ffb4b4]">
                  {message ?? initialMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-3 bg-[#ccff00] px-6 py-4 text-xs font-black uppercase tracking-[0.24em] text-[#121212] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Signing In" : "Sign In"}
                <span className={`material-symbols-outlined text-[18px] ${submitting ? "animate-spin" : ""}`}>
                  {submitting ? "progress_activity" : "login"}
                </span>
              </button>

              <p className="text-xs leading-6 text-[#7c7f80]">
                Your first admin user should be created in Supabase Authentication, then added to the
                `admin_users` table.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#101010] px-6 py-10 text-[#f0f1f2] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-[32px] text-[#ccff00]">progress_activity</span>
          <span className="text-sm font-bold uppercase tracking-widest text-[#808080]">Loading Admin Portal...</span>
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
