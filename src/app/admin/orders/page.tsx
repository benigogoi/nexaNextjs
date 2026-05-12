"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    const matchesSearch = 
      (ord.display_id && ord.display_id.toLowerCase().includes(search.toLowerCase())) ||
      (ord.customer_name && ord.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (ord.customer_email && ord.customer_email.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === "All" || ord.status?.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-[#2a2a2a] pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Fulfillment Center</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Orders</h1>
        </div>
        <button 
          onClick={fetchOrders}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#ccff00] hover:text-white transition-colors"
        >
          <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          Refresh
        </button>
      </header>

      {/* Filter/Search Bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 flex items-center gap-3 px-4 md:border-r border-[#2a2a2a] w-full">
          <span className="material-symbols-outlined text-[#808080]">search</span>
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Customer Name or Email..." 
            className="w-full bg-transparent border-none text-white focus:ring-0 text-sm placeholder:text-[#606060]"
          />
        </div>
        <div className="flex gap-2 px-4 overflow-x-auto w-full md:w-auto">
          {["All", "Pending", "Processing", "Shipped", "Delivered"].map((status) => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-sm whitespace-nowrap transition-colors ${
                statusFilter === status 
                ? "bg-[#ccff00] text-[#121212]" 
                : "text-[#a0a0a0] hover:text-white"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2a2a2a] bg-[#161616]">
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Order ID</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Customer</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Date</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Status</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Payment</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Total</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <span className="material-symbols-outlined animate-spin text-4xl text-[#ccff00]">progress_activity</span>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Decrypting Database...</p>
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <span className="material-symbols-outlined text-4xl text-[#333333]">inventory_2</span>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">No matching transmissions found</p>
                </td>
              </tr>
            ) : (
              filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#222222] transition-colors group">
                  <td className="p-6 text-[11px] font-mono font-bold text-[#ccff00] uppercase tracking-wider">
                    {ord.display_id || ord.id.split('-')[0]}
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col">
                      <span className="text-sm text-[#e0e0e0] font-medium">{ord.customer_name}</span>
                      <span className="text-[10px] text-[#606060] font-mono">{ord.customer_email}</span>
                    </div>
                  </td>
                  <td className="p-6 text-[11px] text-[#a0a0a0] font-mono uppercase">
                    {formatDate(ord.created_at)}
                  </td>
                  <td className="p-6">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-sm
                      ${ord.status?.toLowerCase() === 'pending' ? 'bg-orange-500/10 text-orange-500' : 
                        ord.status?.toLowerCase() === 'processing' ? 'bg-[#333333] text-[#a0a0a0]' : 
                        ord.status?.toLowerCase() === 'shipped' ? 'bg-[#ccff00]/10 text-[#ccff00]' : 
                        ord.status?.toLowerCase() === 'delivered' ? 'bg-green-500/10 text-green-500' :
                        'bg-[#222222] text-[#808080]'
                      }
                    `}>
                      {ord.status || 'Pending'}
                    </span>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-[#808080] uppercase tracking-tighter">
                        {ord.payment_method || 'Razorpay'}
                      </span>
                      <span className={`text-[8px] font-black uppercase ${ord.payment_status === 'paid' ? 'text-green-500' : 'text-red-500'}`}>
                        {ord.payment_status || 'Unpaid'}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-bold text-white tracking-tight">
                    {formatCurrency(ord.total)}
                  </td>
                  <td className="p-6 text-right">
                    <button className="text-[10px] font-bold uppercase tracking-widest text-[#a0a0a0] hover:text-white px-3 py-1 border border-[#333333] hover:border-[#a0a0a0] transition-colors rounded-sm">
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
