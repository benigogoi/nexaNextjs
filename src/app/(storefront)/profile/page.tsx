"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, initialize, signOut } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  // Profile data
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [updateLoading, setUpdateLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"orders" | "addresses">("orders");
  const itemsPerPage = 5;

  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    setMounted(true);
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push("/"); 
    }
    if (user) {
      fetchProfileAndOrders();
      fetchAddresses();
    }
  }, [user, loading, mounted, router]);

  async function fetchProfileAndOrders() {
    // Fetch profile
    let { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    
    // Fallback: Create profile if it doesn't exist
    if (!profileData) {
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({ id: user!.id, full_name: user!.email?.split("@")[0] })
        .select()
        .single();
      profileData = newProfile;
    }

    if (profileData) {
      setProfile(profileData);
      setEditName(profileData.full_name || "");
      setEditPhone(profileData.phone || "");
    }

    // Fetch orders
    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    if (ordersData) setOrders(ordersData);
  }

  async function fetchAddresses() {
    const { data } = await supabase
      .from("user_addresses")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setAddresses(data);
  }

  const handleAddressAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    
    const payload = {
      user_id: user!.id,
      ...addressForm
    };

    if (editingAddressId) {
      const { error } = await supabase
        .from("user_addresses")
        .update(payload)
        .eq("id", editingAddressId);
      if (!error) {
        setIsAddingAddress(false);
        setEditingAddressId(null);
        fetchAddresses();
      }
    } else {
      const { error } = await supabase
        .from("user_addresses")
        .insert([payload]);
      if (!error) {
        setIsAddingAddress(false);
        fetchAddresses();
      }
    }
    setUpdateLoading(false);
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    const { error } = await supabase
      .from("user_addresses")
      .delete()
      .eq("id", id);
    if (!error) fetchAddresses();
  };

  const startEditAddress = (addr: any) => {
    setAddressForm({
      full_name: addr.full_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || "",
      landmark: addr.landmark || "",
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
    });
    setEditingAddressId(addr.id);
    setIsAddingAddress(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editName, phone: editPhone })
      .eq("id", user!.id);
    
    if (!error) {
      setProfile({ ...profile, full_name: editName, phone: editPhone });
      setIsEditing(false);
    }
    setUpdateLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/"); 
  };

  if (!mounted || loading) {
    return (
      <main className="pt-40 pb-24 px-8 max-w-4xl mx-auto min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined text-[48px] animate-spin text-[var(--color-primary)]">progress_activity</span>
      </main>
    );
  }

  if (!user) return null; 

  return (
    <main className="min-h-screen bg-[var(--color-surface)] pt-32 pb-24 px-5 sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        
        {/* Header Section */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-[var(--color-outline-variant)]/30 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[var(--color-primary)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[var(--color-primary)]">Customer Universe</span>
            </div>
          <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-black uppercase tracking-[-0.05em] leading-[0.85] text-[var(--color-on-surface)] md:text-[clamp(2.5rem,7vw,4.5rem)] text-4xl">
              Personal<br /><span className="text-[var(--color-secondary)]/30 italic">Dashboard</span>
            </h1>
          </div>
          
          <button 
            onClick={handleSignOut} 
            className="group flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.2em] text-[var(--color-secondary)] hover:text-red-500 transition-all duration-300"
          >
            Terminal Session
            <div className="w-10 h-10 rounded-full border border-[var(--color-outline-variant)]/30 flex items-center justify-center group-hover:border-red-500/30 group-hover:bg-red-50 transition-all">
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </div>
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-12 xl:gap-20 items-start">
          
          {/* Left Column: Profile & Stats */}
          <div className="space-y-8 lg:sticky lg:top-32">
            
            {/* Profile Card */}
            <div className="bg-[var(--color-surface-container-lowest)] p-10 rounded-[3rem] border border-[var(--color-outline-variant)]/30 shadow-xl shadow-black/[0.02] relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-10">
                  <div className="w-20 h-20 rounded-[2rem] bg-[var(--color-primary-container)] text-[var(--color-on-background)] flex items-center justify-center text-3xl font-black shadow-lg shadow-[var(--color-primary-container)]/20">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)} 
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] hover:underline"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Identity Name</label>
                      <input 
                        value={editName} 
                        onChange={e => setEditName(e.target.value)} 
                        className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" 
                        placeholder="Full Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Secure Line</label>
                      <input 
                        value={editPhone} 
                        onChange={e => setEditPhone(e.target.value)} 
                        className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" 
                        placeholder="Phone Number"
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="submit" disabled={updateLoading} className="flex-1 bg-[var(--color-on-background)] text-[var(--color-primary-container)] py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] disabled:opacity-50 hover:scale-[1.02] transition-all">
                        {updateLoading ? "Updating..." : "Commit Changes"}
                      </button>
                      <button type="button" onClick={() => setIsEditing(false)} className="px-6 bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[var(--color-surface-dim)] transition-all">
                        Abort
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-2">Authenticated Name</p>
                      <p className="text-xl font-black text-[var(--color-on-surface)] uppercase tracking-tight">{profile?.full_name || "New Explorer"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-2">Digital Address</p>
                      <p className="text-sm font-bold text-[var(--color-on-surface)] opacity-70">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--color-secondary)] mb-2">Contact Link</p>
                      <p className="text-sm font-bold text-[var(--color-on-surface)]">{profile?.phone || "Disconnected"}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Decorative background shape */}
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--color-primary-container)] opacity-5 blur-[60px] rounded-full" />
            </div>

            {/* Loyalty / Status Card */}
            <div className="bg-[var(--color-on-background)] text-white p-8 rounded-[2.5rem] shadow-2xl shadow-black/10 relative overflow-hidden">
               <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 block mb-6">Account Status</span>
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[var(--color-primary-container)]">verified_user</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Premium Member</p>
                    <p className="text-[10px] text-white/40 mt-1 uppercase tracking-tight">Active since {new Date(user.created_at).getFullYear()}</p>
                  </div>
               </div>
               {/* Accent glow */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary-container)] opacity-10 blur-3xl" />
            </div>
          </div>

          {/* Right Column: Order History */}
            <div className="flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[var(--color-outline-variant)]/10 pb-4 gap-4">
                <div className="flex gap-6 sm:gap-8">
                  <button 
                    onClick={() => setActiveTab("orders")}
                    className={`text-[11px] sm:text-sm font-black uppercase tracking-widest pb-2 transition-all relative ${activeTab === 'orders' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-secondary)]/50 hover:text-[var(--color-secondary)]'}`}
                  >
                    Orders
                    {activeTab === 'orders' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-primary)] rounded-full" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab("addresses")}
                    className={`text-[11px] sm:text-sm font-black uppercase tracking-widest pb-2 transition-all relative ${activeTab === 'addresses' ? 'text-[var(--color-on-surface)]' : 'text-[var(--color-secondary)]/50 hover:text-[var(--color-secondary)]'}`}
                  >
                    Addresses
                    {activeTab === 'addresses' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--color-primary)] rounded-full" />}
                  </button>
                </div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-secondary)] opacity-60">
                  {activeTab === 'orders' ? `${orders.length} Entries` : `${addresses.length} Saved`}
                </p>
              </div>

              {activeTab === 'orders' ? (
                <>
                  {orders.length === 0 ? (
                    <div className="bg-[var(--color-surface-container-low)] p-20 text-center rounded-[3rem] border border-[var(--color-outline-variant)]/20 shadow-inner">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <span className="material-symbols-outlined text-[32px] text-[var(--color-outline-variant)]">history</span>
                      </div>
                      <h3 className="text-xl font-black uppercase text-[var(--color-on-surface)] mb-4">No records found</h3>
                      <p className="text-sm text-[var(--color-secondary)] mb-10 max-w-xs mx-auto">Your order timeline is currently blank. Start your journey in our shop.</p>
                      <Link href="/shop" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-[var(--color-primary)] hover:underline group">
                        Initiate Commerce
                        <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 gap-6">
                        {orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((order) => {
                          const firstItem = order.items?.[0];
                          return (
                            <div 
                              key={order.id} 
                              className="group bg-[var(--color-surface-container-lowest)] rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary)]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-black/[0.03] overflow-hidden"
                            >
                        {/* Main Card Body */}
                        <div className="p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8">
                          
                          {/* Left: Product Info */}
                          <div className="flex items-center gap-4 sm:gap-6">
                            <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-[1.8rem] sm:rounded-[2.2rem] bg-[var(--color-surface-container-low)] overflow-hidden flex-shrink-0 relative shadow-inner">
                              {firstItem?.image_url ? (
                                <img src={firstItem.image_url} alt="Order" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center opacity-10">
                                  <span className="material-symbols-outlined text-[24px] sm:text-[32px]">inventory_2</span>
                                </div>
                              )}
                              {order.items?.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[8px] font-black px-2 py-0.5 rounded-lg shadow-lg">
                                  +{order.items.length - 1}
                                </div>
                              )}
                            </div>
      
                            <div className="space-y-1 sm:space-y-2 flex-1">
                               <div className="flex items-center gap-2 sm:gap-3">
                                 <p className="text-[9px] sm:text-[10px] font-black text-[var(--color-secondary)]/40 uppercase tracking-[0.2em]">
                                   {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                 </p>
                                 <span className="w-1 h-1 rounded-full bg-[var(--color-outline-variant)]/40" />
                                 <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)]">Verified</span>
                               </div>
                               <h3 className="text-xl sm:text-2xl font-black text-[var(--color-on-surface)] tracking-tighter uppercase leading-none">
                                 #{order.id.split('-')[0]}
                               </h3>
                               <p className="text-[9px] sm:text-[11px] font-bold text-[var(--color-secondary)] uppercase tracking-[0.2em]">
                                 {order.items?.length || 0} PRODUCTS
                               </p>
                            </div>
                          </div>
      
                          {/* Right: Status & Price */}
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-4 border-t border-[var(--color-outline-variant)]/10 pt-4 sm:border-0 sm:pt-0">
                             <div className="sm:text-right">
                               <p className="hidden sm:block text-[9px] font-black uppercase tracking-[0.4em] text-[var(--color-secondary)] mb-1">Value</p>
                               <p className="text-2xl sm:text-4xl font-black text-[var(--color-on-surface)] tracking-tighter leading-none">₹{Number(order.total).toFixed(0)}</p>
                             </div>
                             <div className="flex items-center gap-2 sm:gap-3 bg-[var(--color-primary-container)]/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[var(--color-primary-container)]/20">
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-[var(--color-primary-container)] animate-pulse" />
                                <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-on-primary-container)]">
                                  {order.status}
                                </span>
                             </div>
                          </div>
                        </div>
      
                        {/* Bottom Action Bar */}
                        <div className="bg-[var(--color-surface-container-low)]/50 border-t border-[var(--color-outline-variant)]/10 p-3 sm:p-4 sm:px-8 flex flex-wrap gap-2 sm:gap-4">
                           <Link 
                              href={`/order-success?id=${order.id}`} 
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-2.5 bg-white rounded-xl sm:rounded-2xl border border-[var(--color-outline-variant)]/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface)] hover:bg-[var(--color-on-background)] hover:text-white transition-all"
                           >
                              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">analytics</span>
                              Details
                           </Link>
                           <button 
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3 sm:px-5 py-3 sm:py-2.5 bg-white rounded-xl sm:rounded-2xl border border-[var(--color-outline-variant)]/20 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-on-surface)] hover:bg-[var(--color-on-background)] hover:text-white transition-all"
                           >
                              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">download</span>
                              Invoice
                           </button>
                           <button 
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-2.5 bg-[var(--color-primary-container)] rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--color-on-background)] hover:scale-[1.03] transition-all shadow-lg"
                           >
                              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">local_shipping</span>
                              Track
                           </button>
                        </div>
                            </div>
                          );
                        })}
                      </div>
      
                      {/* Pagination UI */}
                      {orders.length > itemsPerPage && (
                        <div className="flex items-center justify-center gap-4 pt-10">
                          <button 
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="w-12 h-12 rounded-full border border-[var(--color-outline-variant)]/20 flex items-center justify-center text-[var(--color-on-surface)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface-container-high)] transition-all"
                          >
                            <span className="material-symbols-outlined">chevron_left</span>
                          </button>
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.ceil(orders.length / itemsPerPage) }).map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i + 1)}
                                className={`w-10 h-10 rounded-full text-[10px] font-black uppercase transition-all ${
                                  currentPage === i + 1 
                                  ? "bg-[var(--color-on-background)] text-white shadow-lg" 
                                  : "bg-[var(--color-surface-container-low)] text-[var(--color-secondary)] hover:bg-[var(--color-surface-container-high)]"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                          <button 
                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(orders.length / itemsPerPage), prev + 1))}
                            disabled={currentPage === Math.ceil(orders.length / itemsPerPage)}
                            className="w-12 h-12 rounded-full border border-[var(--color-outline-variant)]/20 flex items-center justify-center text-[var(--color-on-surface)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--color-surface-container-high)] transition-all"
                          >
                            <span className="material-symbols-outlined">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {isAddingAddress ? (
                    <div className="bg-[var(--color-surface-container-lowest)] p-8 sm:p-10 rounded-[3rem] border border-[var(--color-outline-variant)]/30 shadow-xl">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight text-[var(--color-on-surface)]">
                          {editingAddressId ? "Modify Security Line" : "New Address Entry"}
                        </h3>
                        <button 
                          onClick={() => { setIsAddingAddress(false); setEditingAddressId(null); }}
                          className="text-[10px] font-black uppercase tracking-widest text-[var(--color-secondary)] hover:text-red-500 transition-colors"
                        >
                          Abort
                        </button>
                      </div>
                      <form onSubmit={handleAddressAction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Recipient Name</label>
                          <input required value={addressForm.full_name} onChange={e => setAddressForm({...addressForm, full_name: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="Full Name" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Street Address</label>
                          <input required value={addressForm.line1} onChange={e => setAddressForm({...addressForm, line1: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="House/Flat No., Street, Area" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Apt / Suite (Optional)</label>
                          <input value={addressForm.line2} onChange={e => setAddressForm({...addressForm, line2: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="Apartment, suite, etc." />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Landmark (Optional)</label>
                          <input value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="Near Landmark" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">City</label>
                          <input required value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="City" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">State</label>
                          <input required value={addressForm.state} onChange={e => setAddressForm({...addressForm, state: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="State" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">PIN Code</label>
                          <input required value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="6-digit PIN" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-secondary)] ml-1">Phone Number</label>
                          <input required value={addressForm.phone} onChange={e => setAddressForm({...addressForm, phone: e.target.value})} className="w-full text-sm font-bold p-4 bg-[var(--color-surface-container-low)] rounded-2xl border-none focus:ring-2 focus:ring-[var(--color-primary-container)] text-[var(--color-on-surface)] transition-all" placeholder="Phone" />
                        </div>
                        <div className="md:col-span-2 pt-6">
                          <button 
                            type="submit" 
                            disabled={updateLoading}
                            className="w-full bg-[var(--color-on-background)] text-[var(--color-primary-container)] py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.25em] hover:scale-[1.01] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3 disabled:opacity-50"
                          >
                            {updateLoading ? "Syncing..." : editingAddressId ? "Update Address" : "Save Address"}
                            {!updateLoading && <span className="material-symbols-outlined text-[18px]">save</span>}
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="bg-[var(--color-surface-container-lowest)] p-8 rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 hover:border-[var(--color-primary)]/40 transition-all duration-500 group shadow-lg shadow-black/[0.01]">
                          <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-container-low)] flex items-center justify-center text-[var(--color-primary)]">
                              <span className="material-symbols-outlined">location_on</span>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => startEditAddress(addr)}
                                className="w-9 h-9 rounded-full bg-white border border-[var(--color-outline-variant)]/20 flex items-center justify-center text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button 
                                onClick={() => deleteAddress(addr.id)}
                                className="w-9 h-9 rounded-full bg-white border border-[var(--color-outline-variant)]/20 flex items-center justify-center text-[var(--color-secondary)] hover:text-red-500 transition-all"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-sm font-black uppercase tracking-widest text-[var(--color-on-surface)]">{addr.full_name}</p>
                             <div className="text-xs text-[var(--color-secondary)] leading-relaxed opacity-70">
                               <p>{addr.line1}</p>
                               {addr.line2 && <p>{addr.line2}</p>}
                               {addr.landmark && <p className="italic text-[9px] mt-1">Lnd: {addr.landmark}</p>}
                               <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                             </div>
                             <p className="text-[10px] font-black text-[var(--color-on-surface)] pt-2 tracking-widest">{addr.phone}</p>
                          </div>
                        </div>
                      ))}
                      
                      <button 
                        onClick={() => {
                          setAddressForm({ full_name: "", phone: "", line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" });
                          setIsAddingAddress(true);
                        }}
                        className="flex flex-col items-center justify-center p-10 rounded-[2.5rem] border-2 border-dashed border-[var(--color-outline-variant)]/30 text-[var(--color-secondary)] hover:border-[var(--color-primary-container)] hover:text-[var(--color-primary)] transition-all min-h-[220px]"
                      >
                        <span className="material-symbols-outlined text-[40px] mb-4">add_location_alt</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">New Entry</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
      </div>
    </main>
  );
}
