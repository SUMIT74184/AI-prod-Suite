'use client'

/**
 * components/mindmap-viewer.tsx
 * ==============================
 * Renders the JSON mindmap tree returned by POST /api/py/generate/mindmap
 * as an interactive, collapsible tree UI.
 *
 * Props:
 *   tree    — The root MindmapNode object from the backend.
 *   onClose — Called when the user closes the mindmap panel.
 *
 * The tree format matches what the backend returns:
 * {
 *   title: string,
 *   color?: string,         // hex color for top-level branches
 *   children: MindmapNode[]
 * }
 */

import { useState } from 'react'
import { X, ChevronRight, ChevronDown, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MindmapNode {
  title: string
  color?: string
  children?: MindmapNode[]
}

interface MindmapViewerProps {
  tree: MindmapNode
  onClose: () => void
}

// ---------------------------------------------------------------------------
// TreeNode — recursive component for each node in the mindmap
// ---------------------------------------------------------------------------

function TreeNode({
  node,
  depth = 0,
  parentColor,
}: {
  node: MindmapNode
  depth?: number
  parentColor?: string
}) {
  // Top-level branches start collapsed so the tree isn't overwhelming
  const [isOpen, setIsOpen] = useState(depth < 1)

  const hasChildren = node.children && node.children.length > 0
  // Use this node's color, or inherit from parent (for sub-nodes)
  const activeColor = node.color || parentColor || '#ffc285'

  return (
    <div className={cn('select-none', depth > 0 && 'ml-5 border-l border-white/[0.06] pl-4')}>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group',
          'hover:bg-white/[0.04] transition-colors'
        )}
        onClick={() => hasChildren && setIsOpen((o) => !o)}
      >
        {/* Expand/collapse chevron */}
        <span className="w-4 h-4 flex-shrink-0 text-gray-600">
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="w-4 h-4" style={{ color: activeColor }} />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )
          ) : (
            <span
              className="block w-2 h-2 rounded-full mx-auto"
              style={{ backgroundColor: activeColor + '60' }}
            />
          )}
        </span>

        {/* Colored dot for branch nodes */}
        {depth === 0 && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeColor }}
          />
        )}

        {/* Node title */}
        <span
          className={cn(
            'text-sm leading-snug',
            depth === 0
              ? 'text-[14px] tracking-tight text-white'
              : depth === 1
              ? 'text-gray-300'
              : 'text-gray-500'
          )}
        >
          {node.title}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isOpen && (
        <div className="mt-0.5">
          {node.children!.map((child, idx) => (
            <TreeNode
              key={idx}
              node={child}
              depth={depth + 1}
              parentColor={activeColor}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MindmapViewer — the panel that wraps the tree
// ---------------------------------------------------------------------------

export default function MindmapViewer({ tree, onClose }: MindmapViewerProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-500">
            <Brain className="h-3.5 w-3.5 text-[#ff7a17]" />
            Mind map
          </div>
          <p className="mt-1 truncate text-[16px] tracking-tight text-white">{tree.title}</p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/[0.06] hover:text-white"
          title="Close mind map"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Root node + tree */}
      <div className="relative flex-1 space-y-1 overflow-y-auto p-5">
        <div className="lab-grid-bg pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(180deg,#000,transparent_60%)]" />
        {/* Root node (central topic) */}
        <div className="relative mb-4 inline-flex items-center gap-2.5 rounded-full border border-[#ff7a17]/30 bg-[#ff7a17]/10 py-1.5 pl-2 pr-4 shadow-[0_0_30px_-10px_rgba(255,122,23,0.6)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff7a17] shadow-[0_0_8px_#ff7a17]" />
          <span className="text-[14.5px] text-white">{tree.title}</span>
        </div>

        {/* First-level branches */}
        <div className="relative">
          {tree.children?.map((branch, idx) => (
            <TreeNode key={idx} node={branch} depth={0} />
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="border-t border-white/[0.06] px-5 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
          Click any branch to expand · {countNodes(tree)} nodes total
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Utility: count total nodes in the tree
// ---------------------------------------------------------------------------
function countNodes(node: MindmapNode): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countNodes(child), 0) ?? 0)
}
