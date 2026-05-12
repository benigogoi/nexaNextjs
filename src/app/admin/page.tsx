"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    activeOrders: 0,
    totalCustomers: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Orders for metrics
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("total, status");

      if (ordersError) throw ordersError;

      const revenue = orders?.reduce((acc, ord) => acc + Number(ord.total), 0) || 0;
      const activeOrders = orders?.filter(ord => 
        ord.status?.toLowerCase() !== 'delivered' && 
        ord.status?.toLowerCase() !== 'cancelled'
      ).length || 0;

      // Fetch Customers count
      const { count: customerCount, error: customerError } = await supabase
        .from("customers")
        .select("*", { count: 'exact', head: true });

      // Fetch Recent Orders
      const { data: latest, error: latestError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setMetrics({
        revenue,
        activeOrders,
        totalCustomers: customerCount || 0
      });
      setRecentOrders(latest || []);
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col gap-5 border-b border-[#2a2a2a] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ccff00] mb-2 block">System Status: Online</span>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white sm:text-4xl">Command Center</h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#808080]">Server Time</p>
          <p className="text-sm font-mono text-[#e0e0e0] uppercase">
            {new Date().toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })} | LIVE
          </p>
        </div>
      </header>

      {/* Top Metrics */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 flex flex-col justify-between group hover:border-[#ccff00]/30 transition-colors">
          <div className="flex justify-between items-start mb-12">
            <span className="material-symbols-outlined text-[#808080] group-hover:text-[#ccff00] transition-colors">account_balance</span>
            <span className="text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded-sm uppercase tracking-widest">Revenue</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] mb-1">Gross Revenue (Total)</p>
            <p className="text-3xl font-black tracking-tight text-white">
              {loading ? "..." : formatCurrency(metrics.revenue)}
            </p>
          </div>
        </div>
        
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#ccff00]/30 transition-colors">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ccff00]/5 blur-[50px] rounded-full"></div>
          <div className="flex justify-between items-start mb-12 relative z-10">
            <span className="material-symbols-outlined text-[#808080] group-hover:text-[#ccff00] transition-colors">inventory_2</span>
            <span className="text-[10px] font-bold text-[#ccff00] bg-[#ccff00]/10 px-2 py-1 rounded-sm uppercase tracking-widest">Active</span>
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] mb-1">Active Orders</p>
            <p className="text-3xl font-black tracking-tight text-white">
              {loading ? "..." : metrics.activeOrders}
            </p>
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8 flex flex-col justify-between group hover:border-[#ccff00]/30 transition-colors">
          <div className="flex justify-between items-start mb-12">
            <span className="material-symbols-outlined text-[#808080] group-hover:text-[#ccff00] transition-colors">group</span>
            <span className="text-[10px] font-bold text-[#808080] bg-[#2a2a2a] px-2 py-1 rounded-sm uppercase tracking-widest">Total</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] mb-1">Registered Customers</p>
            <p className="text-3xl font-black tracking-tight text-white">
              {loading ? "..." : metrics.totalCustomers}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid Area */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-8 bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8">
          <div className="mb-8 flex flex-col gap-3 border-b border-[#2a2a2a] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">Priority Queue (Recent Orders)</h2>
            <Link href="/admin/orders" className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ccff00] hover:underline">View All Orders</Link>
          </div>
          <div className="space-y-4 min-h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <span className="material-symbols-outlined animate-spin text-2xl text-[#333333]">progress_activity</span>
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#404040]">
                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                <p className="text-[10px] font-bold uppercase tracking-widest">No recent transmissions</p>
              </div>
            ) : (
              recentOrders.map((ord) => (
                <div key={ord.id} className="flex flex-col gap-4 p-4 hover:bg-[#222222] transition-colors border-l-2 border-transparent hover:border-[#ccff00] sm:flex-row sm:items-center sm:justify-between group">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
                    <span className="text-[10px] font-mono font-bold text-[#606060] group-hover:text-[#a0a0a0] transition-colors uppercase">
                      {ord.id.split('-')[0]}...
                    </span>
                    <span className="text-sm font-medium text-[#e0e0e0]">{ord.customer_name}</span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
                    <span className="text-sm font-bold text-white sm:w-24 sm:text-right">{formatCurrency(ord.total)}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-sm text-center sm:w-32 
                      ${ord.status?.toLowerCase() === 'pending' ? 'bg-orange-500/10 text-orange-500' : 
                        ord.status?.toLowerCase() === 'processing' ? 'bg-[#333333] text-[#a0a0a0]' : 
                        ord.status?.toLowerCase() === 'shipped' ? 'bg-[#ccff00]/10 text-[#ccff00]' : 
                        'bg-[#e0e0e0] text-[#121212]'}`}>
                      {ord.status || 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#1a1a1a] border border-[#2a2a2a] p-6 sm:p-8">
          <div className="mb-8 flex items-center justify-between border-b border-[#2a2a2a] pb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-white">System Actions</h2>
          </div>
          <div className="flex flex-col gap-4">
            <Link href="/admin/products" className="flex items-center justify-between p-5 bg-[#ccff00] text-[#121212] hover:bg-white transition-colors group">
              <span className="text-xs font-black uppercase tracking-[0.2em]">Manage Products</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">category</span>
            </Link>
            <Link href="/admin/bundles" className="flex items-center justify-between p-5 bg-[#ccff00]/15 text-[#ccff00] hover:bg-[#ccff00]/25 transition-colors group border border-[#ccff00]/30">
              <span className="text-xs font-black uppercase tracking-[0.2em]">Manage Bundles</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">inventory</span>
            </Link>
            <button 
              onClick={fetchDashboardData}
              className="flex items-center justify-between p-5 bg-[#222222] text-white hover:bg-[#2a2a2a] transition-colors border border-[#333333]"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a0a0a0]">Sync Dashboard</span>
              <span className={`material-symbols-outlined text-[18px] text-[#a0a0a0] ${loading ? 'animate-spin' : ''}`}>sync</span>
            </button>
            <Link href="/admin/settings" className="flex items-center justify-between p-5 bg-[#222222] text-white hover:bg-[#2a2a2a] transition-colors border border-[#333333]">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a0a0a0]">System Settings</span>
              <span className="material-symbols-outlined text-[18px] text-[#a0a0a0]">settings</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
