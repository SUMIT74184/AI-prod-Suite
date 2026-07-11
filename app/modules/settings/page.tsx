import { Settings, User, Bell, Shield, Palette } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-sidebar-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Settings Sidebar */}
          <div className="col-span-1 space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-sidebar-accent text-sidebar-accent-foreground transition-colors">
              <User className="w-4 h-4" /> Account
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors">
              <Palette className="w-4 h-4" /> Appearance
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors">
              <Bell className="w-4 h-4" /> Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors">
              <Shield className="w-4 h-4" /> Security
            </button>
          </div>

          {/* Settings Content */}
          <div className="col-span-1 md:col-span-3 space-y-6">
            
            {/* Account Section */}
            <section className="p-6 rounded-2xl bg-card border border-border">
              <h2 className="text-xl font-semibold mb-4 text-card-foreground">Profile Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
                  <input 
                    type="text" 
                    defaultValue="User"
                    className="w-full max-w-md px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
                  <input 
                    type="email" 
                    defaultValue="user@example.com"
                    disabled
                    className="w-full max-w-md px-3 py-2 bg-muted border border-border rounded-md text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Your email is managed by your authentication provider.</p>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="p-6 rounded-2xl bg-card border border-red-500/20">
              <h2 className="text-xl font-semibold mb-4 text-red-500">Danger Zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button className="px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-sm font-medium transition-colors">
                Delete Account
              </button>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
