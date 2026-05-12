export default function AdminSettingsPage() {
  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-3xl">
      <header className="flex justify-between items-end border-b border-[#2a2a2a] pb-6">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#808080] mb-2 block">System Configuration</span>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">Settings</h1>
        </div>
      </header>

      <form className="space-y-8 bg-[#1a1a1a] border border-[#2a2a2a] p-8">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-[#ccff00] mb-2">Access Control</h2>
          <p className="text-xs text-[#808080] mb-8">Update your administrative credentials to maintain node security.</p>
        </div>
        
        <div className="space-y-6 max-w-md">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Current Password</label>
            <input 
              type="password" 
              className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-white transition-colors text-sm" 
              placeholder="••••••••" 
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">New Password</label>
            <input 
              type="password" 
              className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-white transition-colors text-sm" 
              placeholder="••••••••" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">Confirm New Password</label>
            <input 
              type="password" 
              className="w-full bg-[#121212] border border-[#333333] focus:border-[#ccff00] focus:ring-0 px-4 py-3 text-white transition-colors text-sm" 
              placeholder="••••••••" 
            />
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-[#2a2a2a]">
          <button type="button" className="px-8 py-3 text-xs font-black uppercase tracking-widest bg-[#e0e0e0] text-[#121212] hover:bg-white transition-colors">
            Update Credentials
          </button>
        </div>
      </form>
    </div>
  );
}
