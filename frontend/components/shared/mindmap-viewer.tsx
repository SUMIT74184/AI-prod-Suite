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
  const activeColor = node.color || parentColor || '#6366f1'

  return (
    <div className={cn('select-none', depth > 0 && 'ml-5 border-l border-[#1e1e1e] pl-4')}>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group',
          'hover:bg-[rgba(255,255,255,0.04)] transition-colors'
        )}
        onClick={() => hasChildren && setIsOpen((o) => !o)}
      >
        {/* Expand/collapse chevron */}
        <span className="w-4 h-4 flex-shrink-0 text-[#4a4a4a]">
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
              ? 'font-semibold text-white'
              : depth === 1
              ? 'font-medium text-[#d1d5db]'
              : 'font-normal text-[#9ca3af]'
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
    <div className="flex flex-col h-full bg-[#0f0f0f] border border-[#1e2024] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2024] bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#6366f1]" />
          <span className="text-sm font-semibold text-white">Mind Map</span>
          <span className="text-xs text-[#4a4a4a] font-mono ml-1">
            {tree.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-[#4a4a4a] hover:text-white hover:bg-[#1e2024] transition-colors"
          title="Close mind map"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Root node + tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {/* Root node (central topic) */}
        <div className="flex items-center gap-2 mb-4 px-2">
          <div className="w-3 h-3 rounded-full bg-white flex-shrink-0" />
          <span className="text-base font-bold text-white">{tree.title}</span>
        </div>

        {/* First-level branches */}
        {tree.children?.map((branch, idx) => (
          <TreeNode key={idx} node={branch} depth={0} />
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-[#1e2024] bg-[#0a0a0a]">
        <p className="text-xs text-[#4a4a4a] font-mono">
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
