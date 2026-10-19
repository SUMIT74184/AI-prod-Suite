import { Handle, Position, NodeProps } from 'reactflow'
import {
  Upload, Download, Cog, FileText, Database, Globe, Mail, Webhook,
  Brain, Sparkles, FileCheck, Zap, ArrowRightLeft,
  Search, BarChart3, MessageSquare, Trash2, Check, Plus, Loader2
} from 'lucide-react'
import { ReactNode } from 'react'

// ─── Node registry (icon + category colour) ───
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
  // Display-only extras computed by the page
  step?: number
  hint?: string
  isLeaf?: boolean
}

export const CARD_W = 264

// Solid, app-style fill derived from the category colour
export function bubbleFill(accent: string) {
  return `linear-gradient(150deg, color-mix(in srgb, ${accent} 72%, white) 0%, ${accent} 48%, color-mix(in srgb, ${accent} 62%, black) 100%)`
}

export function blockMeta(label: string, type: WorkflowNodeData['type']) {
  return NODE_REGISTRY[label] || FALLBACK_META[type] || FALLBACK_META.process
}

// Zapier-style step card: app icon, "N. Kind", name, short description
export default function WorkflowNode({ id, data, selected }: NodeProps<WorkflowNodeData>) {
  const meta = blockMeta(data.label, data.type)
  const status = data.status || 'idle'
  const kind = data.type === 'input' ? 'Trigger' : data.type === 'output' ? 'Action' : meta.category

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
  const isDone = status === 'success'
  const isError = status === 'error'

  const handleStyle: React.CSSProperties = {
    width: 8,
    height: 8,
    background: '#0a0a0b',
    border: '1.5px solid rgba(255,255,255,0.4)',
    borderRadius: '50%',
  }

  return (
    <div className="group relative" style={{ width: CARD_W }}>
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-[#141518] p-3 pr-10 transition-all duration-200"
        style={{
          borderColor: selected ? '#ff7a17' : isRunning ? `${meta.accent}aa` : isDone ? 'rgba(52,211,153,0.45)' : isError ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)',
          boxShadow: selected
            ? '0 0 0 3px rgba(255,122,23,0.18), 0 16px 40px -18px rgba(0,0,0,0.9)'
            : isRunning
              ? `0 0 0 3px ${meta.accent}22, 0 16px 40px -18px rgba(0,0,0,0.9)`
              : '0 16px 40px -18px rgba(0,0,0,0.9)',
        }}
      >
        {isRunning && <span className="lab-beam pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />}

        {/* App icon */}
        <span
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2]"
          style={{ background: bubbleFill(meta.accent), boxShadow: `inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 16px -6px ${meta.accent}99` }}
        >
          {meta.icon}
          {data.type === 'input' && (
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#141518] bg-[#111113]">
              <Zap className="h-2 w-2 fill-[#ffc285] text-[#ffc285]" />
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-gray-500">
            {typeof data.step === 'number' && <span className="text-gray-400">{data.step}. </span>}
            {kind}
          </p>
          <p className="truncate text-[14px] leading-tight tracking-tight text-white">{data.label}</p>
          <p className="truncate text-[11.5px] text-gray-500">{isRunning ? 'Running…' : data.hint || 'Custom step'}</p>
        </div>

        {/* Status / delete */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isRunning && <Loader2 className="h-4 w-4 animate-spin text-[#ffc285]" />}
          {isDone && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-black group-hover:hidden">
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          )}
          {isError && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-400 text-[11px] font-bold text-black group-hover:hidden">!</span>}
          {!isRunning && (
            <button
              type="button"
              onClick={handleRemove}
              className="nodrag hidden h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-300 group-hover:flex"
              title="Delete this step"
              aria-label="Remove node"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Handles: top in, bottom out */}
        {data.type !== 'input' && <Handle type="target" position={Position.Top} style={{ ...handleStyle, top: -4 }} />}
        {/* Every step can be followed by another, like Zapier actions */}
        <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: -4 }} />
      </div>

      {/* "+" below the last step of a branch */}
      {data.isLeaf && (
        <div className="absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center">
          <span className="h-5 w-px bg-white/20" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              window.dispatchEvent(new CustomEvent('workflow-node-add-next', { detail: { id } }))
            }}
            className="nodrag nopan flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-[#151619] text-gray-300 shadow-lg transition-all hover:scale-110 hover:border-[#ff7a17] hover:text-[#ffc285]"
            title="Add a step"
            aria-label="Add next step"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
