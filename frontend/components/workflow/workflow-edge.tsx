'use client'

import { useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath, useReactFlow } from 'reactflow'
import { X } from 'lucide-react'

export default function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow()
  const [isHovered, setIsHovered] = useState(false)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const onEdgeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEdges((edges) => edges.filter((edge) => edge.id !== id))
  }

  const showButton = isHovered || selected

  return (
    <>
      {/* Invisible wider path to make hovering/clicking the edge effortless */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="cursor-pointer pointer-events-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Visible animated base edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 2.5 : (style.strokeWidth || 2),
          stroke: isHovered ? '#ffffff' : (style.stroke || '#c4b5fd'),
          filter: isHovered ? 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' : undefined,
          transition: 'stroke 0.2s, stroke-width 0.2s, filter 0.2s',
        }}
      />

      {/* Floating delete button positioned at the center of the edge */}
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
            onClick={onEdgeClick}
            className={`
              w-5 h-5 rounded-full bg-[#181a1e] border border-[#363a3f]
              flex items-center justify-center text-[#7d8187]
              hover:text-white hover:bg-rose-600 hover:border-rose-500 hover:scale-110 active:scale-95
              transition-all duration-150 shadow-md cursor-pointer
              ${showButton ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}
            `}
            title="Delete this connection"
            aria-label="Delete edge"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
