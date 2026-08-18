import { Handle, Position, NodeProps } from 'reactflow'
import {
  Upload, Download, Cog, FileText, Database, Globe, Mail, Webhook,
  Brain, Sparkles, FileCheck, Zap, ArrowRightLeft,
  Search, BarChart3, MessageSquare, X
} from 'lucide-react'
import { ReactNode } from 'react'

// ─── n8n-style node registry ───
interface NodeMeta {
  icon: ReactNode
  accent: string       // border-left + icon bg tint
  accentBg: string     // icon container background
  category: string     // small badge text
}

const NODE_REGISTRY: Record<string, NodeMeta> = {
  // ── Triggers / Inputs ──
  'Upload Resume':   { icon: <Upload className="w-4 h-4" />,      accent: '#a0c3ec', accentBg: 'rgba(160,195,236,0.12)', category: 'Trigger' },
  'Upload Document': { icon: <FileText className="w-4 h-4" />,    accent: '#a0c3ec', accentBg: 'rgba(160,195,236,0.12)', category: 'Trigger' },
  'Fetch API Data':  { icon: <Globe className="w-4 h-4" />,       accent: '#a0c3ec', accentBg: 'rgba(160,195,236,0.12)', category: 'Trigger' },
  'Read Database':   { icon: <Database className="w-4 h-4" />,    accent: '#a0c3ec', accentBg: 'rgba(160,195,236,0.12)', category: 'Trigger' },

  // ── Processing / AI ──
  'Extract Skills':   { icon: <Sparkles className="w-4 h-4" />,     accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Analyze Text':     { icon: <Search className="w-4 h-4" />,       accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Analyze Experience':{ icon: <BarChart3 className="w-4 h-4" />,   accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Summarize':        { icon: <Brain className="w-4 h-4" />,        accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Generate Content': { icon: <Sparkles className="w-4 h-4" />,     accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Generate Summary': { icon: <Brain className="w-4 h-4" />,        accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },
  'Transform Data':   { icon: <ArrowRightLeft className="w-4 h-4" />,accent: '#ffc285', accentBg: 'rgba(255,194,133,0.12)', category: 'Transform' },
  'Validate Input':   { icon: <FileCheck className="w-4 h-4" />,    accent: '#ffc285', accentBg: 'rgba(255,194,133,0.12)', category: 'Logic' },
  'Improve Resume':   { icon: <Sparkles className="w-4 h-4" />,     accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'AI' },

  // ── Outputs / Actions ──
  'Export PDF':      { icon: <Download className="w-4 h-4" />,   accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Output' },
  'Send Email':      { icon: <Mail className="w-4 h-4" />,       accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Action' },
  'Save Database':   { icon: <Database className="w-4 h-4" />,   accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Action' },
  'Webhook Call':    { icon: <Webhook className="w-4 h-4" />,    accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Action' },
  'Display Result':  { icon: <MessageSquare className="w-4 h-4" />,accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Output' },
}

// Fallback for unknown / new nodes
const FALLBACK_META: Record<string, NodeMeta> = {
  input:   { icon: <Zap className="w-4 h-4" />,  accent: '#a0c3ec', accentBg: 'rgba(160,195,236,0.12)', category: 'Trigger' },
  process: { icon: <Cog className="w-4 h-4" />,   accent: '#c4b5fd', accentBg: 'rgba(196,181,253,0.12)', category: 'Process' },
  output:  { icon: <Download className="w-4 h-4" />, accent: '#ff7a17', accentBg: 'rgba(255,122,23,0.12)', category: 'Output' },
}

export interface WorkflowNodeData {
  label: string
  type: 'input' | 'process' | 'output'
  status?: 'idle' | 'running' | 'success' | 'error'
  onRemove?: () => void
}

export default function WorkflowNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const meta = NODE_REGISTRY[data.label] || FALLBACK_META[data.type] || FALLBACK_META.process
  const status = data.status || 'idle'

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.onRemove) {
      data.onRemove()
    } else {
      // Dispatch custom event as fallback
      window.dispatchEvent(new CustomEvent('workflow-node-remove', { detail: { id } }))
    }
  }

  const isRunning = status === 'running'

  return (
    <div
      className="relative group transition-transform duration-200 hover:-translate-y-0.5"
      style={{ minWidth: 210 }}
    >
      {/* Remove Cross Button — pops up on hover or focus */}
      <button
        type="button"
        onClick={handleRemove}
        className="absolute -top-2.5 -right-2.5 z-30 w-6 h-6 rounded-full bg-[#1e2024] border border-[#363a3f] flex items-center justify-center text-[#7d8187] hover:text-white hover:bg-rose-600 hover:border-rose-500 opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-md transform group-hover:scale-105 active:scale-95 cursor-pointer"
        title="Delete this node"
        aria-label="Remove node"
      >
        <X className="w-3.5 h-3.5 stroke-[2.5]" />
      </button>

      {/* Target handle (top) */}
      {data.type !== 'input' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            width: 10,
            height: 10,
            background: '#0a0a0a',
            border: `2px solid ${meta.accent}`,
            borderRadius: '50%',
            top: -5,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          className="hover:scale-125 hover:shadow-[0_0_8px_currentColor]"
        />
      )}

      {/* Ambient animated glow for running / selected states */}
      {isRunning && (
        <div
          className="absolute -inset-0.5 rounded-xl opacity-75 blur-sm animate-pulse pointer-events-none"
          style={{ backgroundColor: meta.accent }}
        />
      )}

      {/* Node body */}
      <div
        style={{
          borderLeft: `3px solid ${meta.accent}`,
          boxShadow: selected
            ? `0 0 0 1px ${meta.accent}, 0 8px 28px rgba(0,0,0,0.6)`
            : isRunning
            ? `0 0 16px ${meta.accent}40, 0 4px 20px rgba(0,0,0,0.5)`
            : '0 2px 14px rgba(0,0,0,0.4)',
        }}
        className={`
          relative bg-[#191919] rounded-lg border border-[#212327]
          transition-all duration-200 overflow-hidden
          ${selected ? 'border-transparent ring-1 ring-white/20' : 'hover:border-[rgba(255,255,255,0.18)]'}
        `}
      >
        {/* Animated top shimmer beam for active nodes */}
        {isRunning && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent animate-pulse" />
        )}

        {/* Header row — icon + label + category */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          {/* Icon badge */}
          <div
            className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
              isRunning ? 'animate-bounce' : ''
            }`}
            style={{ backgroundColor: meta.accentBg, color: meta.accent }}
          >
            {meta.icon}
          </div>

          {/* Label + category */}
          <div className="flex-1 min-w-0">
            <div className="text-[13px] text-white font-medium truncate leading-tight tracking-tight">
              {data.label}
            </div>
            <div
              className="text-[10px] font-mono uppercase tracking-wider mt-0.5 font-medium"
              style={{ color: meta.accent, opacity: 0.85 }}
            >
              {meta.category}
            </div>
          </div>

          {/* Status dot / animated spinner */}
          <div className="shrink-0 flex items-center justify-center">
            {status === 'running' && (
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffc285] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ffc285]"></span>
              </span>
            )}
            {status === 'success' && (
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            )}
            {status === 'error' && (
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
            )}
            {status === 'idle' && (
              <div className="w-2 h-2 rounded-full bg-[#363a3f] group-hover:bg-[#4b5056] transition-colors" />
            )}
          </div>
        </div>

        {/* Bottom bar — metadata strip */}
        <div
          className="px-3.5 py-1.5 border-t border-[#212327]/60 flex items-center justify-between"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="text-[10px] font-mono text-[#7d8187] uppercase tracking-wider">
            {data.type}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.accent, opacity: 0.6 }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.accent, opacity: 0.35 }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: meta.accent, opacity: 0.15 }} />
          </div>
        </div>
      </div>

      {/* Source handle (bottom) */}
      {data.type !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            width: 10,
            height: 10,
            background: '#0a0a0a',
            border: `2px solid ${meta.accent}`,
            borderRadius: '50%',
            bottom: -5,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          className="hover:scale-125 hover:shadow-[0_0_8px_currentColor]"
        />
      )}
    </div>
  )
}
