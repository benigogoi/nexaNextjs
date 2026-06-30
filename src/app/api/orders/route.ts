import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { computeCartFromDb, couponDiscount } from "@/lib/pricing";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { items, customer_name, customer_email, customer_phone, shipping_address, coupon_code, payment_method, payment_status } = body;

    // We use a service role client to insert the order safely from the server.
    // This allows unauthenticated guest checkouts to create an order without opening up RLS inserts to anon.
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

    // Get the user ID if logged in, otherwise null for guest
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();

    // Recompute totals from authoritative DB prices — never trust client-sent amounts.
    const { subtotal, shipping } = await computeCartFromDb(supabaseAdmin, items);

    let appliedCouponData = null;
    if (coupon_code) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (couponError || !coupon) {
        return NextResponse.json({ error: "Invalid or inactive coupon code" }, { status: 400 });
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return NextResponse.json({ error: "Coupon code has expired" }, { status: 400 });
      }

      if (coupon.min_order_value && Number(subtotal) < Number(coupon.min_order_value)) {
        return NextResponse.json({ error: `Minimum order value of ₹${Number(coupon.min_order_value).toFixed(0)} required` }, { status: 400 });
      }

      const { data: usages, error: usageError } = await supabaseAdmin
        .from("coupon_usages")
        .select("id")
        .eq("coupon_id", coupon.id)
        .or(`email.eq.${customer_email}${user?.id ? `,user_id.eq.${user.id}` : ''}`)
        .limit(1);

      if (usages && usages.length > 0) {
        return NextResponse.json({ error: "Coupon code has already been used by you" }, { status: 400 });
      }

      appliedCouponData = coupon;
    }

    const discount = couponDiscount(subtotal, appliedCouponData);
    const total = Math.max(0, subtotal + shipping - discount);

    const { data, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user?.id || null,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        items,
        subtotal,
        shipping,
        total,
        status: "pending",
        payment_method,
        payment_status,
      })
      .select()
      .single();

    if (!error && data && appliedCouponData) {
      await supabaseAdmin
        .from("coupon_usages")
        .insert({
          coupon_id: appliedCouponData.id,
          user_id: user?.id || null,
          email: customer_email,
          order_id: data.id
        });
    }

    if (error) {
      console.error("Order insertion error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    console.error("Order API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
