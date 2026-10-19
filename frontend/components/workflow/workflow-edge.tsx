'use client'

import { useState } from 'react'
import { EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useReactFlow } from 'reactflow'
import { Plus, X } from 'lucide-react'

export type EdgeRunState = 'idle' | 'flowing' | 'done'

export const EDGE_COLORS: Record<EdgeRunState, string> = {
  idle: 'rgba(255,255,255,0.22)',
  flowing: '#ffc285',
  done: 'rgba(52,211,153,0.7)',
}

export default function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<{ state?: EdgeRunState }>) {
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)
  const state = data?.state || 'idle'

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  })

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  // Ask the page to insert a step on this connection
  const onInsert = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('workflow-edge-insert', { detail: { id } }))
  }

  const stroke = isHovered || selected ? 'rgba(255,255,255,0.6)' : EDGE_COLORS[state]

  return (
    <>
      {/* Invisible wider path to make hovering the edge effortless */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="cursor-pointer pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      <path
        d={edgePath}
        fill="none"
        style={{
          stroke,
          strokeWidth: state === 'idle' ? 1.5 : 2,
          strokeDasharray: state === 'flowing' ? '6 6' : undefined,
          transition: 'stroke 0.3s',
        }}
      >
        {state === 'flowing' && <animate attributeName="stroke-dashoffset" from="24" to="0" dur="0.6s" repeatCount="indefinite" />}
      </path>

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan z-30"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            onClick={onInsert}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#151619] text-gray-400 shadow-md transition-all hover:scale-110 hover:border-[#ff7a17] hover:text-[#ffc285]"
            title="Insert a step here"
            aria-label="Insert step"
          >
            <Plus className="h-3 w-3" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`absolute left-full top-1/2 ml-1.5 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-[#111113] text-gray-500 shadow-md transition-all hover:border-red-400 hover:bg-red-500 hover:text-white ${isHovered || selected ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            title="Delete this connection"
            aria-label="Delete edge"
          >
            <X className="h-2.5 w-2.5" strokeWidth={2.5} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
