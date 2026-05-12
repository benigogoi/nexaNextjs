"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectTo?: string;
}

export default function AuthModal({ isOpen, onClose, redirectTo }: AuthModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_in_progress', 'true');
    }
    const targetPath = redirectTo || '/';
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${targetPath}`,
      },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split("@")[0] } }
      });
      if (error) setMessage(error.message);
      else setMessage("Check your email for confirmation!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        onClose();
        if (redirectTo) {
          router.push(redirectTo);
          router.refresh();
        } else {
          window.location.reload();
        }
      }
    }
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn transition-all"
      onClick={onClose} // Close when clicking the backdrop
    >
      <div 
        className="bg-[var(--color-surface)] w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl border border-white/5 relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-[var(--color-secondary)] hover:text-[var(--color-on-surface)] transition-colors z-10">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="p-12">
          <header className="text-center mb-10">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-[var(--color-on-surface)] mb-2">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h2>
            <p className="text-[10px] text-[var(--color-secondary)] uppercase font-black tracking-[0.3em]">NexaPrint Storefront</p>
          </header>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center gap-3 py-4 bg-white text-black rounded-2xl hover:bg-gray-100 transition-all font-bold text-xs"
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="G" />
              Google
            </button>
            <button 
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center gap-3 py-4 bg-[#1877F2] text-white rounded-2xl hover:opacity-90 transition-all font-bold text-xs"
            >
              <img src="https://www.facebook.com/favicon.ico" className="w-4 h-4 brightness-0 invert" alt="F" />
              Facebook
            </button>
          </div>

          <div className="relative mb-8 text-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[var(--color-outline-variant)]/20"></div></div>
            <span className="relative bg-[var(--color-surface)] px-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-secondary)]">Or Email</span>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <input 
              type="email" placeholder="Email Address" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--color-surface-container-low)] border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary-container)] transition-all"
            />
            <input 
              type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-[var(--color-surface-container-low)] border-none rounded-2xl py-4 px-6 text-sm font-bold focus:ring-2 focus:ring-[var(--color-primary-container)] transition-all"
            />

            {message && <p className="text-[10px] font-bold text-center uppercase tracking-widest text-[var(--color-primary)]">{message}</p>}

            <button 
              type="submit" disabled={loading}
              className="w-full bg-[var(--color-primary-container)] text-[var(--color-on-background)] py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:-translate-y-1 transition-all disabled:opacity-50"
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-center text-[10px] font-black uppercase tracking-widest text-[var(--color-secondary)] mt-8 hover:text-[var(--color-primary)] transition-colors"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
