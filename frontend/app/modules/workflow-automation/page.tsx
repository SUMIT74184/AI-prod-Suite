'use client'

import { useCallback, useEffect, useState } from 'react'
export const dynamic = 'force-dynamic'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Plus, Play, Save, Trash2, Upload, FileText, Globe, Database,
  Sparkles, Search, BarChart3, Brain, ArrowRightLeft, FileCheck,
  Download, Mail, Webhook, MessageSquare, Loader2, CheckCircle2
} from 'lucide-react'
import WorkflowNode, { WorkflowNodeData } from '@/components/workflow/workflow-node'
import WorkflowEdge from '@/components/workflow/workflow-edge'

const nodeTypes = { custom: WorkflowNode }
const edgeTypes = { custom: WorkflowEdge }

const initialNodes: Node<WorkflowNodeData>[] = [
  { id: '1', data: { label: 'Upload Resume', type: 'input', status: 'idle' }, position: { x: 300, y: 30 }, type: 'custom' },
  { id: '2', data: { label: 'Extract Skills', type: 'process', status: 'idle' }, position: { x: 300, y: 170 }, type: 'custom' },
  { id: '3', data: { label: 'Analyze Experience', type: 'process', status: 'idle' }, position: { x: 90, y: 320 }, type: 'custom' },
  { id: '4', data: { label: 'Generate Summary', type: 'process', status: 'idle' }, position: { x: 510, y: 320 }, type: 'custom' },
  { id: '5', data: { label: 'Improve Resume', type: 'process', status: 'idle' }, position: { x: 300, y: 470 }, type: 'custom' },
  { id: '6', data: { label: 'Export PDF', type: 'output', status: 'idle' }, position: { x: 300, y: 620 }, type: 'custom' },
]

// All edges configured with animation, custom cross-remove button & category colors
const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'custom', animated: true, style: { stroke: '#a0c3ec', strokeWidth: 2 } },
  { id: 'e2-3', source: '2', target: '3', type: 'custom', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', type: 'custom', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', type: 'custom', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', type: 'custom', animated: true, style: { stroke: '#c4b5fd', strokeWidth: 2 } },
  { id: 'e5-6', source: '5', target: '6', type: 'custom', animated: true, style: { stroke: '#ff7a17', strokeWidth: 2 } },
]

// Icon map for sidebar items
const ICON_MAP: Record<string, React.ReactNode> = {
  'Upload Resume': <Upload className="w-3.5 h-3.5" />,
  'Upload Document': <FileText className="w-3.5 h-3.5" />,
  'Fetch API Data': <Globe className="w-3.5 h-3.5" />,
  'Read Database': <Database className="w-3.5 h-3.5" />,
  'Extract Skills': <Sparkles className="w-3.5 h-3.5" />,
  'Analyze Text': <Search className="w-3.5 h-3.5" />,
  'Analyze Experience': <BarChart3 className="w-3.5 h-3.5" />,
  'Summarize': <Brain className="w-3.5 h-3.5" />,
  'Generate Content': <Sparkles className="w-3.5 h-3.5" />,
  'Generate Summary': <Brain className="w-3.5 h-3.5" />,
  'Transform Data': <ArrowRightLeft className="w-3.5 h-3.5" />,
  'Validate Input': <FileCheck className="w-3.5 h-3.5" />,
  'Improve Resume': <Sparkles className="w-3.5 h-3.5" />,
  'Export PDF': <Download className="w-3.5 h-3.5" />,
  'Send Email': <Mail className="w-3.5 h-3.5" />,
  'Save Database': <Database className="w-3.5 h-3.5" />,
  'Webhook Call': <Webhook className="w-3.5 h-3.5" />,
  'Display Result': <MessageSquare className="w-3.5 h-3.5" />,
}

export default function WorkflowAutomationPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionMessage, setExecutionMessage] = useState<string | null>(null)

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setSelectedNode((curr) => (curr?.id === nodeId ? null : curr))
  }, [setNodes, setEdges])

  // Attach delete handlers to nodes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onRemove: () => handleDeleteNode(n.id)
        }
      }))
    )
  }, [handleDeleteNode, setNodes])

  // Global listener for fallback remove event
  useEffect(() => {
    const handleNodeRemoveEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>
      if (customEvent.detail?.id) {
        handleDeleteNode(customEvent.detail.id)
      }
    }
    window.addEventListener('workflow-node-remove', handleNodeRemoveEvent)
    return () => window.removeEventListener('workflow-node-remove', handleNodeRemoveEvent)
  }, [handleDeleteNode])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({
      ...connection,
      type: 'custom',
      animated: true,
      style: { stroke: '#c4b5fd', strokeWidth: 2 }
    }, eds))
  }, [setEdges])

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }

  const handleAddNode = () => {
    const newId = `node-${Date.now()}`
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        data: {
          label: 'New Step',
          type: 'process',
          status: 'idle',
          onRemove: () => handleDeleteNode(newId)
        },
        position: { x: Math.random() * 400 + 150, y: Math.random() * 300 + 100 },
        type: 'custom'
      }
    ])
  }

  const handleRenameNode = (nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
    )
  }

  const handleClearWorkflow = () => {
    if (confirm('Clear the entire workflow?')) {
      setNodes([])
      setEdges([])
      setSelectedNode(null)
    }
  }

  // ─── Live Animated Execution Simulation ───
  const handleExecuteWorkflow = async () => {
    if (isExecuting || nodes.length === 0) return
    setIsExecuting(true)
    setExecutionMessage('Running workflow pipeline...')

    // Reset all nodes to idle
    setNodes((nds) =>
      nds.map((n) => ({ ...n, data: { ...n.data, status: 'idle' } }))
    )

    // Execute nodes sequentially with live animation
    for (let i = 0; i < nodes.length; i++) {
      const targetNodeId = nodes[i].id

      // Set node to running
      setNodes((nds) =>
        nds.map((n) => (n.id === targetNodeId ? { ...n, data: { ...n.data, status: 'running' } } : n))
      )

      await new Promise((resolve) => setTimeout(resolve, 650))

      // Set node to success
      setNodes((nds) =>
        nds.map((n) => (n.id === targetNodeId ? { ...n, data: { ...n.data, status: 'success' } } : n))
      )
    }

    setExecutionMessage('Execution completed successfully!')
    setIsExecuting(false)

    setTimeout(() => {
      setExecutionMessage(null)
    }, 4000)
  }

  const handleSaveWorkflow = () => {
    localStorage.setItem('workflow', JSON.stringify({ nodes, edges }))
    alert('Workflow saved successfully!')
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const raw = event.dataTransfer.getData('application/reactflow')
    if (!raw) return
    const { label, type } = JSON.parse(raw)
    const bounds = event.currentTarget.getBoundingClientRect()
    const position = { x: event.clientX - bounds.left - 100, y: event.clientY - bounds.top - 30 }
    const newId = `node-${Date.now()}`
    
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        data: {
          label,
          type,
          status: 'idle',
          onRemove: () => handleDeleteNode(newId)
        },
        position,
        type: 'custom'
      }
    ])
  }, [handleDeleteNode, setNodes])

  const blockCategories = [
    {
      title: 'Triggers',
      accent: '#a0c3ec',
      accentBg: 'rgba(160,195,236,0.10)',
      hoverBorder: 'rgba(160,195,236,0.4)',
      items: ['Upload Resume', 'Upload Document', 'Fetch API Data', 'Read Database'],
      type: 'input' as const,
    },
    {
      title: 'Processing',
      accent: '#c4b5fd',
      accentBg: 'rgba(196,181,253,0.10)',
      hoverBorder: 'rgba(196,181,253,0.4)',
      items: ['Extract Skills', 'Analyze Text', 'Analyze Experience', 'Summarize', 'Generate Content', 'Generate Summary', 'Transform Data', 'Validate Input', 'Improve Resume'],
      type: 'process' as const,
    },
    {
      title: 'Actions',
      accent: '#ff7a17',
      accentBg: 'rgba(255,122,23,0.10)',
      hoverBorder: 'rgba(255,122,23,0.4)',
      items: ['Export PDF', 'Send Email', 'Save Database', 'Webhook Call', 'Display Result'],
      type: 'output' as const,
    },
  ]

  return (
    <div className="flex h-full bg-[#0a0a0a]">

      {/* ─── Left sidebar: Node catalog ─── */}
      <div className="w-64 border-r border-[#212327] bg-[#0a0a0a] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#212327]">
          <h2 className="text-[14px] text-white font-normal">Node Catalog</h2>
          <p className="xai-caption-mono-sm text-[#7d8187] mt-1">Drag onto canvas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {blockCategories.map((cat) => (
            <div key={cat.title}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.accent }} />
                <h3 className="xai-caption-mono-sm text-[#7d8187]">{cat.title}</h3>
              </div>
              <div className="space-y-1">
                {cat.items.map((label) => (
                  <div
                    key={label}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('application/reactflow', JSON.stringify({ label, type: cat.type }))
                    }}
                    className="flex items-center gap-2.5 px-2.5 py-2 bg-[#141517] border border-[#212327] rounded-lg cursor-grab active:cursor-grabbing transition-all duration-150 hover:bg-[#1a1c20] hover:scale-[1.02] active:scale-95"
                    style={{ borderLeftWidth: 2, borderLeftColor: cat.accent }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = cat.hoverBorder)}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#212327'
                      e.currentTarget.style.borderLeftColor = cat.accent
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.accentBg, color: cat.accent }}
                    >
                      {ICON_MAP[label] || <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <span className="text-[12px] text-[#dadbdf] truncate">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#212327] p-3">
          <button onClick={handleAddNode} className="xai-btn-outline w-full flex items-center justify-center gap-2 py-2 text-[13px]">
            <Plus className="w-3.5 h-3.5" />
            Add Custom Node
          </button>
        </div>
      </div>

      {/* ─── Main canvas ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-[#212327] px-4 py-2.5 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="xai-caption-mono text-[#7d8187]">Workflow Canvas</h1>
            <span className="text-[11px] font-mono text-[#7d8187] bg-[#141517] px-2 py-0.5 rounded border border-[#212327]">
              {nodes.length} nodes · {edges.length} animated connections
            </span>
            {isExecuting && (
              <span className="flex items-center gap-1.5 text-xs text-[#ffc285] bg-[#ffc285]/10 px-2.5 py-1 rounded-full border border-[#ffc285]/30 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Executing Pipeline...
              </span>
            )}
            {executionMessage && !isExecuting && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3" />
                {executionMessage}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className={`xai-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-[12px] ${
                isExecuting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {isExecuting ? 'Running...' : 'Execute'}
            </button>
            <button onClick={handleSaveWorkflow} className="xai-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-[12px]">
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
            <button
              onClick={handleClearWorkflow}
              className="xai-btn-outline flex items-center gap-1.5 px-3 py-1.5 text-[12px] hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#1a1c20" gap={24} size={1.2} />
            <Controls
              style={{ background: '#191919', border: '1px solid #212327', borderRadius: 8 }}
            />
            <MiniMap
              style={{ background: '#141517', border: '1px solid #212327', borderRadius: 8 }}
              nodeColor={() => '#c4b5fd'}
              maskColor="rgba(10,10,10,0.8)"
            />
          </ReactFlow>
        </div>
      </div>

      {/* ─── Right sidebar: Node Inspector ─── */}
      {selectedNode && (
        <div className="w-72 border-l border-[#212327] bg-[#0a0a0a] flex flex-col shrink-0">
          <div className="p-4 border-b border-[#212327] flex items-center justify-between">
            <h3 className="xai-caption-mono text-[#7d8187]">Inspector</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-[#7d8187] hover:text-white transition-colors text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            <div>
              <label className="xai-caption-mono-sm text-[#7d8187] block mb-2">Label</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleRenameNode(selectedNode.id, e.target.value)}
                className="xai-input w-full text-sm"
              />
            </div>

            <div>
              <label className="xai-caption-mono-sm text-[#7d8187] block mb-2">Type</label>
              <select
                value={selectedNode.data.type}
                onChange={(e) => {
                  const newType = e.target.value as 'input' | 'process' | 'output'
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id ? { ...n, data: { ...n.data, type: newType } } : n
                    )
                  )
                  setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, type: newType } })
                }}
                className="xai-input w-full text-sm"
              >
                <option value="input">Trigger</option>
                <option value="process">Processing</option>
                <option value="output">Action</option>
              </select>
            </div>

            <div>
              <label className="xai-caption-mono-sm text-[#7d8187] block mb-2">Status</label>
              <div className="flex items-center gap-2 bg-[#141517] p-2 rounded-lg border border-[#212327]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    selectedNode.data.status === 'running'
                      ? 'bg-[#ffc285] animate-pulse'
                      : selectedNode.data.status === 'success'
                      ? 'bg-emerald-400'
                      : 'bg-[#7d8187]'
                  }`}
                />
                <span className="text-xs text-white capitalize">
                  {selectedNode.data.status || 'idle'}
                </span>
              </div>
            </div>

            <div>
              <label className="xai-caption-mono-sm text-[#7d8187] block mb-2">Position</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-[#7d8187] font-mono">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.position.x)}
                    onChange={(e) => {
                      const p = { ...selectedNode.position, x: parseInt(e.target.value) || 0 }
                      setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, position: p } : n)))
                      setSelectedNode({ ...selectedNode, position: p })
                    }}
                    className="xai-input w-full text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-[#7d8187] font-mono">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedNode.position.y)}
                    onChange={(e) => {
                      const p = { ...selectedNode.position, y: parseInt(e.target.value) || 0 }
                      setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, position: p } : n)))
                      setSelectedNode({ ...selectedNode, position: p })
                    }}
                    className="xai-input w-full text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="xai-caption-mono-sm text-[#7d8187] block mb-2">Node ID</label>
              <p className="text-[11px] font-mono text-[#7d8187] bg-[#141517] px-3 py-2 rounded-lg border border-[#212327]">
                {selectedNode.id}
              </p>
            </div>
          </div>

          <div className="border-t border-[#212327] p-3">
            <button
              onClick={() => handleDeleteNode(selectedNode.id)}
              className="xai-btn-outline w-full flex items-center justify-center gap-2 py-2 text-[13px] hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Node
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
