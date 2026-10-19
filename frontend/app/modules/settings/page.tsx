import { User, Bell, Shield, Palette } from 'lucide-react';
import { ModuleHeader, MonoLabel, ui } from '@/components/workspace/kit';
import { cn } from '@/lib/utils';

const NAV = [
  { icon: User, label: 'Account', active: true },
  { icon: Palette, label: 'Appearance' },
  { icon: Bell, label: 'Notifications' },
  { icon: Shield, label: 'Security' },
];

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      <ModuleHeader
        index="S.00"
        section="Configuration"
        title="Settings"
        description="Manage your account settings and preferences."
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 py-10 md:grid-cols-[200px_1fr]">

          {/* Settings Sidebar */}
          <nav className="space-y-0.5">
            {NAV.map(item => (
              <button
                key={item.label}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] transition-colors',
                  item.active ? 'bg-white/[0.05] text-white' : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                )}
              >
                {item.active && <span className="absolute -left-3 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#ff7a17] shadow-[0_0_10px_#ff7a17]" />}
                <item.icon className={cn('h-4 w-4', item.active ? 'text-[#ffc285]' : 'text-gray-500')} strokeWidth={1.75} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Settings Content */}
          <div className="space-y-6">

            {/* Account Section */}
            <section className="ws-panel p-6">
              <MonoLabel index="01">Account</MonoLabel>
              <h2 className="mb-6 mt-2 text-[19px] tracking-tight text-white">Profile Information</h2>
              <div className="space-y-5">
                <div>
                  <label className={cn(ui.mono, 'mb-2 block')}>Display Name</label>
                  <input
                    type="text"
                    defaultValue="User"
                    className="ws-field h-10 w-full max-w-md px-3.5 text-[14px]"
                  />
                </div>
                <div>
                  <label className={cn(ui.mono, 'mb-2 block')}>Email Address</label>
                  <input
                    type="email"
                    defaultValue="user@example.com"
                    disabled
                    className="ws-field h-10 w-full max-w-md px-3.5 text-[14px]"
                  />
                  <p className="mt-2 text-[12px] text-gray-600">Your email is managed by your authentication provider.</p>
                </div>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="rounded-2xl border border-red-400/15 bg-red-500/[0.03] p-6">
              <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-red-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                Danger Zone
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-md text-[13.5px] leading-relaxed text-gray-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button className={ui.btnDanger}>
                  Delete Account
                </button>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
