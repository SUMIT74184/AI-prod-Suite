import { Settings, User, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <p className="xai-caption-mono-sm text-[#7d8187] mb-2">Configuration</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#1a1c20] border border-[#212327] flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="xai-display-xs text-white">Settings</h1>
          </div>
          <p className="text-[#7d8187] font-normal">Manage your account settings and preferences.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Settings Sidebar */}
          <div className="col-span-1 space-y-0.5">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-normal rounded-lg bg-[#1a1c20] text-white border-l-2 border-white transition-colors">
              <User className="w-4 h-4" /> Account
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-normal rounded-lg text-[#7d8187] hover:bg-[#1a1c20]/50 hover:text-white transition-colors">
              <Palette className="w-4 h-4" /> Appearance
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-normal rounded-lg text-[#7d8187] hover:bg-[#1a1c20]/50 hover:text-white transition-colors">
              <Bell className="w-4 h-4" /> Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-normal rounded-lg text-[#7d8187] hover:bg-[#1a1c20]/50 hover:text-white transition-colors">
              <Shield className="w-4 h-4" /> Security
            </button>
          </div>

          {/* Settings Content */}
          <div className="col-span-1 md:col-span-3 space-y-6">
            
            {/* Account Section */}
            <section className="p-6 rounded-lg bg-[#191919] border border-[#212327]">
              <h2 className="text-lg font-normal mb-4 text-white">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-normal text-[#7d8187] mb-1">Display Name</label>
                  <input 
                    type="text" 
                    defaultValue="User"
                    className="w-full max-w-md px-3 py-2 bg-[#1a1c20] border border-[#212327] rounded-lg text-sm text-white focus:outline-none focus:border-[rgba(255,255,255,0.25)] font-normal transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-normal text-[#7d8187] mb-1">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue="user@example.com"
                    disabled
                    className="w-full max-w-md px-3 py-2 bg-[#0a0a0a] border border-[#212327] rounded-lg text-sm text-[#7d8187] cursor-not-allowed font-normal"
                  />
                  <p className="xai-caption-mono-sm text-[#7d8187] mt-1" style={{ fontSize: '10px' }}>Your email is managed by your authentication provider.</p>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="p-6 rounded-lg bg-[#191919] border border-[rgba(255,68,68,0.2)]">
              <h2 className="text-lg font-normal mb-4 text-[#ff4444]">Danger Zone</h2>
              <p className="text-sm text-[#7d8187] mb-4 font-normal">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button className="px-4 py-2 rounded-full border border-[rgba(255,68,68,0.3)] text-[#ff4444] hover:bg-[rgba(255,68,68,0.1)] hover:border-[rgba(255,68,68,0.5)] text-sm font-normal transition-all">
                Delete Account
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
