"use client";

import { useState } from "react";

export default function PincodeChecker() {
  const [pincode, setPincode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "not_serviceable">("idle");
  const [message, setMessage] = useState("");

  const handleCheck = async () => {
    if (pincode.length !== 6) {
      setMessage("Please enter a valid 6-digit pincode.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/shipping/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode }),
      });

      const data = await res.json();

      if (data.available) {
        setStatus("success");
        const rateText = data.rate > 0 ? `Shipping: ₹${data.rate}` : "Free Shipping!";
        setMessage(`Serviceable! ${rateText}. Estimated delivery in 5-7 days.`);
      } else {
        setStatus("not_serviceable");
        setMessage("Sorry, we don't deliver to this pincode yet.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Failed to check pincode. Please try again later.");
    }
  };

  return (
    <div className="rounded-xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container-lowest)]/40 p-4 shadow-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-3">
        Delivery Check
      </p>
      
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          placeholder="Enter Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          className="flex-1 rounded-lg border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface)] px-3 py-2 text-sm font-bold tracking-widest placeholder:text-[var(--color-secondary)]/50 focus:border-[var(--color-primary)] focus:outline-none transition-all"
        />
        <button
          onClick={handleCheck}
          disabled={status === "loading"}
          className="rounded-lg bg-[var(--color-on-background)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary-container)] transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Check"}
        </button>
      </div>

      {message && (
        <div className={`mt-3 flex items-start gap-2 text-[11px] font-bold tracking-wide ${
          status === "success" ? "text-green-600" : status === "error" || status === "not_serviceable" ? "text-red-500" : "text-[var(--color-secondary)]"
        }`}>
          <span className="mt-0.5">
            {status === "success" ? "✓" : "!"}
          </span>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
