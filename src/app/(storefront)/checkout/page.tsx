"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthModal from "@/components/auth/AuthModal";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabaseClient";
import { loadRazorpay } from "@/lib/loadRazorpay";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, buyNowItem, setBuyNowItem, clearCart } = useCartStore();

  const isBuyNow = searchParams.get("buyNow") === "true";
  const checkoutItems = isBuyNow && buyNowItem ? [buyNowItem] : items;
  const { user, loading, initialize } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [apartment, setApartment] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; type: string } | null>(null);
  const [couponError, setCouponError] = useState("");

  // Saved Address State
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
      setShowAuthModal(false);
      fetchAddresses();
    } else if (mounted && !loading) {
      setShowAuthModal(true);
    }
  }, [user, mounted, loading]);

  const fetchAddresses = async () => {
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSavedAddresses(data);
      if (data.length > 0) {
        setSelectedAddressId(data[0].id);
        setAddressLine(data[0].line1);
        setApartment(data[0].line2 || "");
        setLandmark(data[0].landmark || "");
        setCity(data[0].city);
        setState(data[0].state);
        setZip(data[0].pincode);
        setPhone(data[0].phone);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
      }
    } else {
      setShowAddressForm(true);
    }
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setAddressLine(addr.line1);
    setApartment(addr.line2 || "");
    setLandmark(addr.landmark || "");
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.pincode);
    setPhone(addr.phone);
    setShowAddressForm(false);
    setIsEditingAddress(false);
  };

  const handleAddNewAddress = () => {
    setSelectedAddressId(null);
    setAddressLine("");
    setApartment("");
    setLandmark("");
    setCity("");
    setState("");
    setZip("");
    setShowAddressForm(true);
    setIsEditingAddress(false);
  };

  const handleEditAddress = (addr: any) => {
    setSelectedAddressId(addr.id);
    setAddressLine(addr.line1);
    setApartment(addr.line2 || "");
    setLandmark(addr.landmark || "");
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.pincode);
    setPhone(addr.phone);
    setShowAddressForm(true);
    setIsEditingAddress(true);
  };

  const handleApplyCoupon = async () => {
    setCouponError("");
    if (!couponCode.trim()) return;

    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        setCouponError("Invalid or inactive coupon code");
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError("Coupon code has expired");
        return;
      }

      const currentSubtotal = checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
      if (data.min_order_value && currentSubtotal < Number(data.min_order_value)) {
        setCouponError(`Minimum order value of ₹${Number(data.min_order_value).toFixed(0)} required`);
        return;
      }

      setAppliedCoupon({
        code: data.code,
        discount: Number(data.discount_value),
        type: data.discount_type
      });
      setCouponCode("");
    } catch (err) {
      setCouponError("Failed to validate coupon");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  const cartSubtotal = mounted ? checkoutItems.reduce((acc, item) => acc + item.price * item.quantity, 0) : 0;
  const shipping = cartSubtotal > 499 ? 0 : cartSubtotal > 0 ? 49 : 0;
  const discountAmount = appliedCoupon
    ? (appliedCoupon.type === "percentage"
      ? cartSubtotal * (appliedCoupon.discount / 100)
      : Math.min(cartSubtotal, appliedCoupon.discount))
    : 0;
  const tax = 0;
  const total = Math.max(0, cartSubtotal + shipping - discountAmount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsPlacingOrder(true);
    setError("");

    if (paymentMethod === "cod") {
      await finalizeOrder("cod", "unpaid");
      return;
    }

    try {
      // 1. Load Razorpay script
      const res = await loadRazorpay();
      if (!res) {
        alert("Razorpay SDK failed to load. Are you online?");
        setIsPlacingOrder(false);
        return;
      }

      // 2. Create Razorpay Order in backend
      const rzpOrderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total }),
      });

      const rzpOrderData = await rzpOrderResponse.json();
      if (!rzpOrderResponse.ok) throw new Error(rzpOrderData.error || "Failed to create payment order");

      // 3. Configure Razorpay Options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(total * 100),
        currency: "INR",
        name: "Nexa Design Lab",
        description: "Payment for your order",
        order_id: rzpOrderData.orderId,
        handler: async function (response: any) {
          try {
            // 4. Verify Payment on Server
            const verifyResponse = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            if (verifyData.status === "success") {
              // 5. Finalize and Save Order to DB
              await finalizeOrder("razorpay", "paid");
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err: any) {
            alert(err.message || "Payment verification failed. Please contact support.");
            setIsPlacingOrder(false);
          }
        },
        prefill: {
          name: name,
          email: email,
          contact: phone,
        },
        theme: {
          color: "#000000",
        },
        modal: {
          ondismiss: function () {
            setIsPlacingOrder(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      setError(err.message);
      setIsPlacingOrder(false);
    }
  };

  const finalizeOrder = async (pMethod = "razorpay", pStatus = "paid") => {
    try {
      // If a new address was entered and form was shown, we should save it first or just use it
      let finalAddressId = selectedAddressId;

      if (showAddressForm && !isEditingAddress && !selectedAddressId) {
        const { data: newAddr, error: addrError } = await supabase
          .from("user_addresses")
          .insert([{
            user_id: user?.id,
            full_name: name,
            phone: phone,
            line1: addressLine,
            line2: apartment,
            landmark: landmark,
            city,
            state,
            pincode: zip,
          }])
          .select()
          .single();

        if (addrError) console.error("Could not save address:", addrError);
        else finalAddressId = newAddr.id;
      } else if (showAddressForm && isEditingAddress && selectedAddressId) {
        // Update existing address
        await supabase
          .from("user_addresses")
          .update({
            full_name: name,
            phone: phone,
            line1: addressLine,
            line2: apartment,
            landmark: landmark,
            city,
            state,
            pincode: zip,
          })
          .eq("id", selectedAddressId);
      }

      const orderData = {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        shipping_address: {
          line1: addressLine,
          line2: apartment,
          landmark: landmark,
          city,
          state,
          pincode: zip,
        },
        items: checkoutItems,
        subtotal: cartSubtotal,
        shipping,
        discount_amount: discountAmount,
        coupon_code: appliedCoupon ? appliedCoupon.code : null,
        total,
        payment_method: pMethod,
        payment_status: pStatus,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place order");
      }

      // Success
      setIsSuccess(true);
      if (isBuyNow) {
        setBuyNowItem(null);
      } else {
        clearCart();
      }
      router.push(`/order-success?id=${data.order.id}`);
    } catch (err: any) {
      setError(err.message);
      setIsPlacingOrder(false);
    }
  };

  if (!mounted) return null;

  if (checkoutItems.length === 0 && !isSuccess) {
    return (
      <main className="max-w-[1440px] mx-auto pt-32 pb-24 px-5 sm:px-8 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center py-20 bg-[var(--color-surface-container-lowest)] p-12 rounded-3xl border border-[var(--color-outline-variant)]/20 shadow-sm max-w-lg w-full">
          <span className="material-symbols-outlined text-[64px] text-[var(--color-outline-variant)] mb-4">shopping_basket</span>
          <h2 className="text-2xl font-black text-[var(--color-on-surface)] mb-4 uppercase tracking-tight">Your cart is empty</h2>
          <Link href="/shop" className="px-8 py-3 bg-[var(--color-primary-container)] text-[var(--color-on-background)] font-black text-xs uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity inline-block">
            Explore Designs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1440px] mx-auto pt-32 pb-24 px-5 sm:px-8 min-h-screen text-[var(--color-on-surface)] relative">
      <AuthModal isOpen={showAuthModal} onClose={() => user ? setShowAuthModal(false) : router.push('/shop')} />

      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-12 transition-all duration-500 ${!user ? 'blur-md grayscale pointer-events-none opacity-40 scale-[0.98]' : ''}`}>
        <div className="lg:col-span-2 space-y-12">
          {error && (
            <div className="p-4 bg-red-100 text-red-700 text-sm font-bold rounded-xl border border-red-200 uppercase tracking-tight">
              {error}
            </div>
          )}

          <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-12">
            <section className="space-y-6" id="contact-info">
              <div className="flex items-center gap-4 border-b border-[var(--color-outline-variant)]/30 pb-4">
                <span className="w-6 h-6 flex items-center justify-center bg-[var(--color-primary-container)] text-[var(--color-on-background)] text-[10px] font-black rounded-full">1</span>
                <h2 className="text-xl font-black tracking-tight uppercase text-[var(--color-on-surface)]">Contact Info</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Full Name</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="Your Name" type="text" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Email Address</label>
                  <input readOnly value={email} className="bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/20 rounded-xl py-3 px-4 text-sm text-[var(--color-secondary)] cursor-not-allowed" type="email" />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Phone Number *</label>
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="+91 98765 43210" type="tel" />
                </div>
              </div>
            </section>

            <section className="space-y-6" id="shipping-address">
              <div className="flex items-center gap-4 border-b border-[var(--color-outline-variant)]/30 pb-4">
                <span className="w-6 h-6 flex items-center justify-center bg-[var(--color-primary-container)] text-[var(--color-on-background)] text-[10px] font-bold rounded-full">2</span>
                <h2 className="text-xl font-black tracking-tight uppercase text-[var(--color-on-surface)]">Shipping</h2>
              </div>

              {/* Saved Addresses List */}
              {!showAddressForm && savedAddresses.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        onClick={() => handleSelectAddress(addr)}
                        className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer group ${selectedAddressId === addr.id
                            ? "border-[var(--color-primary-container)] bg-[var(--color-primary-container)]/5"
                            : "border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)]/40"
                          }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-black uppercase tracking-tight text-[var(--color-on-surface)]">{addr.full_name}</p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEditAddress(addr); }}
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-[var(--color-outline-variant)]/20 text-[var(--color-secondary)] hover:text-[var(--color-primary)] shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                            {selectedAddressId === addr.id && (
                              <span className="material-symbols-outlined text-[var(--color-primary)]">check_circle</span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-[var(--color-secondary)] space-y-1 leading-relaxed">
                          <p>{addr.line1}</p>
                          {addr.line2 && <p>{addr.line2}</p>}
                          {addr.landmark && <p className="italic text-[var(--color-secondary)]/60">Landmark: {addr.landmark}</p>}
                          <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                          <p className="pt-2 font-bold text-[var(--color-on-surface)]">{addr.phone}</p>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleAddNewAddress}
                      className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-[var(--color-outline-variant)]/30 text-[var(--color-secondary)] hover:border-[var(--color-primary-container)] hover:text-[var(--color-primary)] transition-all min-h-[140px]"
                    >
                      <span className="material-symbols-outlined text-[32px] mb-2">add_location</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Add New Address</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Address Form (Inline) */}
              {(showAddressForm || savedAddresses.length === 0) && (
                <div className="bg-[var(--color-surface-container-lowest)] p-6 sm:p-8 rounded-[2rem] border border-[var(--color-outline-variant)]/30 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-primary)]">
                      {isEditingAddress ? "Edit Address" : "New Shipping Address"}
                    </h3>
                    {savedAddresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)] hover:text-[var(--color-on-surface)]"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Full Name *</label>
                      <input required value={name} onChange={e => setName(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="Recipient Name" type="text" />
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Street Address *</label>
                      <input required value={addressLine} onChange={e => setAddressLine(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="House/Flat No., Street, Area" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Apartment, suite, etc. (optional)</label>
                      <input value={apartment} onChange={e => setApartment(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="Apt 402, 4th Floor" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Landmark (optional)</label>
                      <input value={landmark} onChange={e => setLandmark(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="Near Apollo Hospital" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">City *</label>
                      <input required value={city} onChange={e => setCity(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="City" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">State *</label>
                      <input required value={state} onChange={e => setState(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="State" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">PIN Code *</label>
                      <input required value={zip} onChange={e => setZip(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="110001" type="text" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-secondary)]">Phone Number *</label>
                      <input required value={phone} onChange={e => setPhone(e.target.value)} className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl focus:ring-2 focus:ring-[var(--color-primary-container)] py-3 px-4 text-sm text-[var(--color-on-surface)]" placeholder="+91 98765 43210" type="tel" />
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-6" id="payment-method">
              <div className="flex items-center gap-4 border-b border-[var(--color-outline-variant)]/30 pb-4">
                <span className="w-6 h-6 flex items-center justify-center bg-[var(--color-primary-container)] text-[var(--color-on-background)] text-[10px] font-bold rounded-full">3</span>
                <h2 className="text-xl font-black tracking-tight uppercase text-[var(--color-on-surface)]">Payment Method</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setPaymentMethod("razorpay")}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer group ${paymentMethod === "razorpay"
                      ? "border-[var(--color-primary-container)] bg-[var(--color-primary-container)]/10"
                      : "border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)]/40"
                    }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[var(--color-secondary)]">payments</span>
                      <p className="text-sm font-black uppercase tracking-tight text-[var(--color-on-surface)]">Pay Online</p>
                    </div>
                    {paymentMethod === "razorpay" && (
                      <span className="material-symbols-outlined text-[var(--color-primary)]">check_circle</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest">Cards, UPI, Netbanking</p>
                </div>

                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={`relative p-6 rounded-2xl border-2 transition-all cursor-pointer group ${paymentMethod === "cod"
                      ? "border-[var(--color-primary-container)] bg-[var(--color-primary-container)]/10"
                      : "border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary-container)]/40"
                    }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[var(--color-secondary)]">local_shipping</span>
                      <p className="text-sm font-black uppercase tracking-tight text-[var(--color-on-surface)]">Cash on Delivery</p>
                    </div>
                    {paymentMethod === "cod" && (
                      <span className="material-symbols-outlined text-[var(--color-primary)]">check_circle</span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest">Pay when you receive order</p>
                </div>
              </div>
            </section>
          </form>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[var(--color-surface-container-lowest)] p-8 rounded-3xl border border-[var(--color-outline-variant)]/30 shadow-sm sticky top-32">
            <h2 className="text-lg font-black uppercase tracking-tight text-[var(--color-on-surface)] mb-6">Order Summary</h2>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 mb-6">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex gap-4 items-center border-b border-[var(--color-outline-variant)]/10 pb-4 last:border-0 last:pb-0">
                  <div className="w-16 h-16 bg-[var(--color-surface-container-low)] rounded-xl overflow-hidden shrink-0">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-[var(--color-on-surface)]">{item.name}</p>
                    {item.size && (
                      <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mt-0.5 block">
                        Size: {item.size}
                      </span>
                    )}
                    {item.finish && (
                      <span className="text-[10px] font-bold text-[var(--color-secondary)] uppercase tracking-widest mt-0.5 block">
                        Finish: {item.finish}
                      </span>
                    )}
                    <p className="text-xs text-[var(--color-secondary)] mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-bold text-sm text-[var(--color-on-surface)]">₹{(item.price * item.quantity).toFixed(0)}</div>
                </div>
              ))}
            </div>

            {/* Coupon Code */}
            <div className="mt-4 pt-4 border-t border-[var(--color-outline-variant)]/30 space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)] block">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  disabled={appliedCoupon !== null}
                  className="flex-1 bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/40 rounded-xl px-4 py-3 text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary-container)] disabled:opacity-50 font-mono tracking-wider uppercase"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-6 bg-[var(--color-on-background)] text-[var(--color-primary-container)] rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Apply
                  </button>
                )}
              </div>
              {couponError && (
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight mt-1">
                  {couponError}
                </p>
              )}
              {appliedCoupon && (
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-tight mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Code {appliedCoupon.code} applied ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.discount}% off` : `₹${appliedCoupon.discount} off`})
                </p>
              )}
            </div>

            <div className="space-y-3 pt-6 border-t border-[var(--color-outline-variant)]/30">
              <div className="flex justify-between items-center text-sm">
                <span className="text-[var(--color-secondary)] font-medium">Subtotal</span>
                <span className="font-bold">₹{cartSubtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-4 border-b border-[var(--color-outline-variant)]/30">
                <span className="text-[var(--color-secondary)] font-medium">Shipping</span>
                <span className={shipping === 0 ? "text-green-600 font-bold uppercase text-[10px] tracking-widest" : "font-bold text-[var(--color-on-surface)]"}>
                  {shipping === 0 ? "Free" : `₹${shipping}`}
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between items-center text-sm text-green-600 font-bold pb-4 border-b border-[var(--color-outline-variant)]/30">
                  <span>Discount ({appliedCoupon.type === 'percentage' ? `${appliedCoupon.discount}%` : 'Flat'})</span>
                  <span>-₹{discountAmount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-black uppercase tracking-tight text-[var(--color-on-surface)]">Total</span>
                <span className="text-3xl font-black text-[var(--color-on-surface)] tracking-tighter">₹{total.toFixed(0)}</span>
              </div>
            </div>

            <button
              form="checkout-form"
              type="submit"
              disabled={isPlacingOrder}
              className="w-full mt-8 bg-[var(--color-primary-container)] text-[var(--color-on-background)] py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:-translate-y-1 hover:shadow-lg transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
            >
              {isPlacingOrder ? <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> : null}
              {isPlacingOrder ? "Processing..." : "Place Order"}
            </button>
            <p className="text-[9px] text-center text-[var(--color-secondary)] uppercase font-bold tracking-widest mt-6">By placing this order you agree to our terms</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="max-w-[1440px] mx-auto pt-32 pb-24 px-5 sm:px-8 min-h-screen flex flex-col items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined animate-spin text-[32px] text-[var(--color-primary)]">progress_activity</span>
          <span className="text-sm font-black uppercase tracking-widest text-[var(--color-secondary)]">Loading Checkout...</span>
        </div>
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
