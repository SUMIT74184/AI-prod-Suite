'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, Activity, Database, Settings, ShieldAlert, 
  LogOut, Search, MoreHorizontal, ArrowUpRight, 
  ArrowDownRight, CheckCircle2, XCircle
} from 'lucide-react'

// Dummy Data
const MOCK_USERS = [
  { id: '1', name: 'Alice Walker', email: 'alice@example.com', status: 'active', joined: '2026-07-10', role: 'user' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', status: 'active', joined: '2026-07-15', role: 'user' },
  { id: '3', name: 'Charlie Davis', email: 'charlie@example.com', status: 'suspended', joined: '2026-08-01', role: 'user' },
  { id: '4', name: 'Timi Administrator', email: 'Timi84@gmail.com', status: 'active', joined: '2026-01-01', role: 'admin' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    // Client-side auth check
    const auth = localStorage.getItem('prodsuite_admin_auth')
    if (auth !== 'true') {
      router.push('/admin/login')
    } else {
      setIsAuthenticated(true)
    }
  }, [router])

  if (!isAuthenticated) return null // Prevent flash of content

  const handleLogout = () => {
    localStorage.removeItem('prodsuite_admin_auth')
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex font-sans selection:bg-red-500/30">
      
      {/* Background ambient effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[800px] opacity-[0.03] bg-[radial-gradient(ellipse_at_center,#ef4444_0%,transparent_70%)]" />
      </div>

      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-red-500/10 bg-black/50 backdrop-blur-md flex flex-col relative z-10">
        <div className="h-16 flex items-center px-6 border-b border-red-500/10">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="font-semibold tracking-wide">Admin Portal</span>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Activity className="w-4 h-4" /> Overview
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Users className="w-4 h-4" /> Users
          </button>
          <button 
            onClick={() => setActiveTab('models')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'models' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Database className="w-4 h-4" /> Models & API
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'settings' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Settings className="w-4 h-4" /> Settings
          </button>
        </nav>

        <div className="p-4 border-t border-red-500/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 h-screen overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-8 border-b border-white/5 bg-black/20 backdrop-blur-sm sticky top-0 z-20">
          <h1 className="text-lg font-medium capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-gray-500">Timi84@gmail.com</span>
            <img src="/ProdSuite.png" alt="Logo" className="w-8 h-8 rounded-full border border-white/10" />
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto w-full">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <p className="text-gray-400 text-sm font-medium mb-2">Total Active Users</p>
                  <div className="flex items-end gap-4">
                    <h3 className="text-4xl font-semibold">1,284</h3>
                    <span className="flex items-center text-emerald-400 text-sm font-medium mb-1"><ArrowUpRight className="w-4 h-4 mr-1"/> 12%</span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <p className="text-gray-400 text-sm font-medium mb-2">API Requests (24h)</p>
                  <div className="flex items-end gap-4">
                    <h3 className="text-4xl font-semibold">142.5k</h3>
                    <span className="flex items-center text-emerald-400 text-sm font-medium mb-1"><ArrowUpRight className="w-4 h-4 mr-1"/> 5%</span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                  <p className="text-gray-400 text-sm font-medium mb-2">Avg Latency</p>
                  <div className="flex items-end gap-4">
                    <h3 className="text-4xl font-semibold">234ms</h3>
                    <span className="flex items-center text-red-400 text-sm font-medium mb-1"><ArrowDownRight className="w-4 h-4 mr-1"/> -2%</span>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl mt-6">
                <h3 className="text-lg font-medium mb-6">System Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium">OpenAI API Connectivity</span>
                    </div>
                    <span className="text-emerald-400 text-sm">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium">Anthropic API Connectivity</span>
                    </div>
                    <span className="text-emerald-400 text-sm">Operational</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-medium">Primary Database (PostgreSQL)</span>
                    </div>
                    <span className="text-emerald-400 text-sm">Operational</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Search users..." className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 w-64 transition-all" />
                </div>
                <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                  Export CSV
                </button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-black/40 border-b border-white/10 text-gray-400 uppercase tracking-wider font-mono text-xs">
                    <tr>
                      <th className="px-6 py-4 font-medium">User</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {MOCK_USERS.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{user.name}</div>
                          <div className="text-gray-500">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase ${user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-300'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {user.status === 'active' ? (
                              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="text-gray-300">Active</span></>
                            ) : (
                              <><XCircle className="w-4 h-4 text-red-500" /> <span className="text-gray-300">Suspended</span></>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{user.joined}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODELS TAB */}
          {activeTab === 'models' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-lg font-medium mb-2">Model Governance</h3>
                <p className="text-sm text-gray-400 mb-6">Manage global default models and provider routing settings.</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Global LLM</label>
                    <select className="w-full max-w-md bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-white/30 text-white appearance-none">
                      <option>GPT-4o (OpenAI)</option>
                      <option>Claude 3.5 Sonnet (Anthropic)</option>
                      <option>Gemini 1.5 Pro (Google)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Fallback Model (On Rate Limit)</label>
                    <select className="w-full max-w-md bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-white/30 text-white appearance-none">
                      <option>Claude 3 Haiku (Anthropic)</option>
                      <option>GPT-4o mini (OpenAI)</option>
                    </select>
                  </div>
                  <hr className="border-white/10" />
                  <div className="flex items-center justify-between max-w-md">
                    <div>
                      <h4 className="font-medium text-sm text-white">Strict Fallback Routing</h4>
                      <p className="text-xs text-gray-500">Automatically route to fallback if primary fails</p>
                    </div>
                    <div className="w-10 h-6 bg-emerald-500 rounded-full relative cursor-pointer border border-white/10">
                      <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between max-w-md">
                    <div>
                      <h4 className="font-medium text-sm text-white">Enforce Safety Filters</h4>
                      <p className="text-xs text-gray-500">Apply maximum provider safety thresholds globally</p>
                    </div>
                    <div className="w-10 h-6 bg-white/20 rounded-full relative cursor-pointer border border-white/10">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-300 flex flex-col items-center justify-center py-20">
              <Settings className="w-16 h-16 text-gray-600 mb-4" />
              <h2 className="text-xl font-medium">Platform Settings</h2>
              <p className="text-gray-500 max-w-md text-center">Platform configurations are currently locked. Please contact the infrastructure team to make global configuration changes.</p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
