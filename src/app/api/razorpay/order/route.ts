import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { razorpay } from "@/lib/razorpay";
import { computeCartFromDb, couponDiscount } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const { items, coupon_code, currency = "INR" } = await request.json();

    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Recompute the amount from authoritative DB prices — never trust the client.
    const { subtotal, shipping } = await computeCartFromDb(supabaseAdmin, items);

    let discount = 0;
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", String(coupon_code).toUpperCase())
        .eq("is_active", true)
        .single();

      const valid =
        coupon &&
        (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
        (!coupon.min_order_value || subtotal >= Number(coupon.min_order_value));

      if (valid) discount = couponDiscount(subtotal, coupon);
    }

    const total = Math.max(0, subtotal + shipping - discount);
    if (total <= 0) {
      return NextResponse.json({ error: "Cart is empty or invalid" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: Math.round(total * 100), // Razorpay expects paise
      currency,
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({ orderId: order.id, amount: total });
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
