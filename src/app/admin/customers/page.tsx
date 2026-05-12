export default function AdminCustomersPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b border-[#2a2a2a] pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">Client Database</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Customers</h1>
        </div>
      </header>

      {/* Filter/Search Bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 flex gap-4 items-center">
        <div className="flex-1 flex items-center gap-3 px-4">
          <span className="material-symbols-outlined text-[#808080]">search</span>
          <input 
            type="text" 
            placeholder="Search by Name, Email, or ID..." 
            className="w-full bg-transparent border-none text-white focus:ring-0 text-sm placeholder:text-[#606060]"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2a2a2a] bg-[#161616]">
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Customer ID</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Name</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Email Address</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-center">Lifetime Orders</th>
              <th className="p-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080] text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {[
              { id: "CST-0091", name: "Jonathan Vane", email: "jonathan.v@example.com", orders: 4, spent: "₹1,450.00" },
              { id: "CST-0084", name: "Alice Chen", email: "alice.c@example.com", orders: 12, spent: "₹4,200.00" },
              { id: "CST-0072", name: "Marcus Wright", email: "m.wright@example.com", orders: 1, spent: "₹85.00" },
              { id: "CST-0051", name: "Elara Vance", email: "elara.v@example.com", orders: 2, spent: "₹420.00" },
              { id: "CST-0012", name: "David Kim", email: "dkim99@example.com", orders: 8, spent: "₹3,150.32" }
            ].map((cst, idx) => (
              <tr key={idx} className="hover:bg-[#222222] transition-colors group cursor-pointer">
                <td className="p-6 text-xs font-mono font-bold text-[#808080]">{cst.id}</td>
                <td className="p-6 text-sm text-white font-bold">{cst.name}</td>
                <td className="p-6 text-sm text-[#a0a0a0]">{cst.email}</td>
                <td className="p-6 text-center">
                  <span className="text-sm font-black text-[#e0e0e0] bg-[#333333] px-3 py-1 rounded-sm">
                    {cst.orders}
                  </span>
                </td>
                <td className="p-6 text-right text-sm font-bold text-[#ccff00] tracking-tight">{cst.spent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
