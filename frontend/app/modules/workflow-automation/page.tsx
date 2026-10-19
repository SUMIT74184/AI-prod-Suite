'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
export const dynamic = 'force-dynamic'
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  MiniMap,
  type ReactFlowInstance
} from 'reactflow'
import 'reactflow/dist/style.css'
import {
  Plus, Play, Save, Trash2, Upload, FileText, Globe, Database,
  Sparkles, Search, BarChart3, Brain, ArrowRightLeft, FileCheck,
  Download, Mail, Webhook, MessageSquare, Loader2, Check, X, ZoomIn, ZoomOut, Maximize2, PanelRight, Zap,
  MousePointerClick, Workflow as WorkflowIcon, type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModuleHeader, MonoLabel, StatusDot, Kbd, ui } from '@/components/workspace/kit'
import { SegmentTabs } from '@/components/workspace/review-report'
import WorkflowNode, { WorkflowNodeData, CARD_W } from '@/components/workflow/workflow-node'
import BlockPicker, { type PickerMode } from '@/components/workflow/block-picker'
import WorkflowEdge, { type EdgeRunState } from '@/components/workflow/workflow-edge'

const nodeTypes = { custom: WorkflowNode }
const edgeTypes = { custom: WorkflowEdge }

const initialNodes: Node<WorkflowNodeData>[] = [
  { id: '1', data: { label: 'Upload Resume', type: 'input', status: 'idle' }, position: { x: 0, y: 0 }, type: 'custom' },
  { id: '2', data: { label: 'Extract Skills', type: 'process', status: 'idle' }, position: { x: 0, y: 130 }, type: 'custom' },
  { id: '3', data: { label: 'Analyze Experience', type: 'process', status: 'idle' }, position: { x: -150, y: 260 }, type: 'custom' },
  { id: '4', data: { label: 'Generate Summary', type: 'process', status: 'idle' }, position: { x: 150, y: 260 }, type: 'custom' },
  { id: '5', data: { label: 'Improve Resume', type: 'process', status: 'idle' }, position: { x: 0, y: 390 }, type: 'custom' },
  { id: '6', data: { label: 'Export PDF', type: 'output', status: 'idle' }, position: { x: 0, y: 520 }, type: 'custom' },
]

// Edge colour/animation is derived from node run state at render time (see displayEdges)
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

  // Studio UI state
  const [workflowName, setWorkflowName] = useState('Resume pipeline')
  const [panelTab, setPanelTab] = useState<'inspector' | 'run'>('inspector')
  // Zapier-style "Add a step" dialog and where the new step should go
  const [picker, setPicker] = useState<{ mode: PickerMode; from?: string; edgeId?: string } | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const [runLog, setRunLog] = useState<{ t: Date; label: string; status: string }[]>([])
  const prevStatus = useRef<Record<string, string>>({})

  // A new execution starts with a fresh log on the Run tab
  useEffect(() => {
    if (isExecuting) {
      setRunLog([])
      setPanelTab('run')
      setPanelOpen(true)
    }
  }, [isExecuting])

  // Derive the run log from node status transitions
  useEffect(() => {
    const entries: { t: Date; label: string; status: string }[] = []
    nodes.forEach(n => {
      const st = n.data.status || 'idle'
      const prev = prevStatus.current[n.id]
      if (prev !== undefined && prev !== st && st !== 'idle') entries.push({ t: new Date(), label: n.data.label, status: st })
      prevStatus.current[n.id] = st
    })
    if (entries.length) setRunLog(log => [...log, ...entries])
  }, [nodes])

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

  // "Add a step" dialog: opened from a connection's "+", the "+" under a step, the toolbar, or the trigger slot
  const openPicker = (opts: { from?: string; edgeId?: string; triggersOnly?: boolean } = {}) => {
    const labelOf = (nodeId?: string) => nodes.find(n => n.id === nodeId)?.data.label || 'previous step'
    let mode: PickerMode = { kind: 'any' }
    if (opts.triggersOnly) mode = { kind: 'trigger' }
    else if (opts.edgeId) {
      const edge = edges.find(e => e.id === opts.edgeId)
      mode = { kind: 'between', from: labelOf(edge?.source), to: labelOf(edge?.target) }
    } else if (opts.from) mode = { kind: 'after', label: labelOf(opts.from) }
    setPicker({ mode, from: opts.from, edgeId: opts.edgeId })
  }

  const ROW = 130
  const addBlock = (label: string, type: WorkflowNodeData['type']) => {
    const newId = `node-${Date.now()}`
    let position = { x: 0, y: 0 }
    const newEdges: Edge[] = []
    let replacedEdge: string | undefined
    let shiftFromY: number | null = null

    if (picker?.edgeId) {
      // Insert between two steps: take the lower step's slot and push everything below down
      const edge = edges.find(e => e.id === picker.edgeId)
      const src = nodes.find(n => n.id === edge?.source)
      const tgt = nodes.find(n => n.id === edge?.target)
      if (edge && src && tgt) {
        position = { ...tgt.position }
        shiftFromY = tgt.position.y
        replacedEdge = edge.id
        newEdges.push(
          { id: `e${src.id}-${newId}`, source: src.id, target: newId, type: 'custom' },
          { id: `e${newId}-${tgt.id}`, source: newId, target: tgt.id, type: 'custom' }
        )
      }
    } else if (picker?.from) {
      // Append below a step (side by side if it already has children)
      const src = nodes.find(n => n.id === picker.from)
      if (src) {
        const siblings = edges.filter(e => e.source === src.id).length
        position = { x: src.position.x + siblings * 300, y: src.position.y + ROW }
        newEdges.push({ id: `e${src.id}-${newId}`, source: src.id, target: newId, type: 'custom' })
      }
    } else if (nodes.length > 0) {
      const ys = nodes.map(n => n.position.y)
      const lowest = nodes.reduce((a, n) => (n.position.y > a.position.y ? n : a))
      position = type === 'input' ? { x: 0, y: Math.min(...ys) - ROW } : { x: lowest.position.x, y: lowest.position.y + ROW }
    }

    const newNode: Node<WorkflowNodeData> = {
      id: newId,
      type: 'custom',
      position,
      data: { label, type, status: 'idle', onRemove: () => handleDeleteNode(newId) },
    }
    // Keep array order = execution order = step numbers
    const insertAt =
      picker?.edgeId ? nodes.findIndex(n => n.id === edges.find(e => e.id === picker.edgeId)?.target)
      : picker?.from ? nodes.findIndex(n => n.id === picker.from) + 1
      : type === 'input' ? 0
      : nodes.length
    setNodes(nds => {
      const shifted = shiftFromY === null ? nds : nds.map(n => (n.position.y >= shiftFromY! ? { ...n, position: { ...n.position, y: n.position.y + ROW } } : n))
      const at = insertAt < 0 ? shifted.length : insertAt
      return [...shifted.slice(0, at), newNode, ...shifted.slice(at)]
    })
    setEdges(eds => [...eds.filter(e => e.id !== replacedEdge), ...newEdges])
    setPicker(null)
    setSelectedNode(newNode)
    setPanelTab('inspector')
    setPanelOpen(true)
    setTimeout(() => rfInstance?.fitView({ padding: 0.2, maxZoom: 1, duration: 400 }), 50)
  }

  // "+" buttons on steps and connections ask for the dialog
  useEffect(() => {
    const onAddNext = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (id) openPicker({ from: id })
    }
    const onInsert = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id
      if (id) openPicker({ edgeId: id })
    }
    window.addEventListener('workflow-node-add-next', onAddNext)
    window.addEventListener('workflow-edge-insert', onInsert)
    return () => {
      window.removeEventListener('workflow-node-add-next', onAddNext)
      window.removeEventListener('workflow-edge-insert', onInsert)
    }
  })

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
    const position = { x: event.clientX - bounds.left - CARD_W / 2, y: event.clientY - bounds.top - 36 }
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

  const doneCount = nodes.filter(n => n.data.status === 'success').length
  const progress = nodes.length ? doneCount / nodes.length : 0
  const typeCounts = {
    input: nodes.filter(n => n.data.type === 'input').length,
    process: nodes.filter(n => n.data.type === 'process').length,
    output: nodes.filter(n => n.data.type === 'output').length,
  }

  // Edges light up as data moves: flowing into a running node, green once both ends finished
  const statusById: Record<string, string> = Object.fromEntries(nodes.map(n => [n.id, n.data.status || 'idle']))
  // Step numbers follow execution order
  const displayNodes = nodes.map((n, i) => ({
    ...n,
    data: { ...n.data, step: i + 1, hint: BLOCK_HINTS[n.data.label], isLeaf: !edges.some(e => e.source === n.id) },
  }))

  const displayEdges = edges.map(e => {
    const src = statusById[e.source]
    const tgt = statusById[e.target]
    const state: EdgeRunState = src === 'success' && tgt === 'running' ? 'flowing' : src === 'success' && tgt === 'success' ? 'done' : 'idle'
    return {
      ...e,
      animated: false,
      data: { ...e.data, state },
    }
  })

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0a0a]">
      <ModuleHeader
        index="M.05"
        section="Automation"
        title="Workflow"
        accent="Canvas"
        description="Start with a trigger · add steps with + · run it once to test"
        actions={
          <>
            <button onClick={handleSaveWorkflow} className={ui.btnOutline}>
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button onClick={handleClearWorkflow} className={ui.btnDanger}>
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </>
        }
      />

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        {/* ─── CENTER: canvas ─── */}
        <section className="ws-flow relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0b0c]" onDragOver={onDragOver} onDrop={onDrop}>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,122,23,0.07),rgba(124,58,237,0.04),transparent)] blur-2xl" />

          {/* Floating title */}
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0a0a0b]/85 py-1 pl-3 pr-1 backdrop-blur">
            <WorkflowIcon className="h-3.5 w-3.5 text-[#ffc285]" />
            <input
              value={workflowName}
              onChange={e => setWorkflowName(e.target.value)}
              className="w-40 bg-transparent text-[13px] text-white outline-none"
              aria-label="Workflow name"
            />
            <span className="rounded-full bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-gray-500">{nodes.length} · {edges.length}</span>
          </div>

          {/* Floating toolbar */}
          <div className="absolute right-4 top-4 z-10 flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-[#0a0a0b]/85 p-1 backdrop-blur">
            <button
              onClick={() => openPicker()}
              className="flex h-7 items-center gap-1.5 rounded-full bg-white pl-2 pr-3 text-[12.5px] text-black transition-colors hover:bg-[#ffc285]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              Add step
            </button>
            <span className="mx-0.5 h-4 w-px bg-white/10" />
            <CanvasButton icon={ZoomOut} label="Zoom out" onClick={() => rfInstance?.zoomOut()} />
            <CanvasButton icon={ZoomIn} label="Zoom in" onClick={() => rfInstance?.zoomIn()} />
            <CanvasButton icon={Maximize2} label="Fit view" onClick={() => rfInstance?.fitView({ padding: 0.2, maxZoom: 1, duration: 400 })} />
            <span className="mx-0.5 h-4 w-px bg-white/10" />
            <CanvasButton icon={PanelRight} label={panelOpen ? 'Hide panel' : 'Show panel'} onClick={() => setPanelOpen(o => !o)} active={panelOpen} />
          </div>

          <ReactFlow
            nodes={displayNodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(e, n) => { onNodeClick(e, n); setPanelTab('inspector'); setPanelOpen(true) }}
            onPaneClick={() => setSelectedNode(null)}
            onInit={setRfInstance}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            connectionLineStyle={{ stroke: '#ff7a17', strokeWidth: 1.5 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="rgba(255,255,255,0.14)" gap={20} size={1.1} />
            <MiniMap
              style={{ background: '#0c0d0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, width: 150, height: 96 }}
              nodeColor={(n) => (n.data?.type === 'input' ? '#a0c3ec' : n.data?.type === 'output' ? '#ff7a17' : '#c4b5fd')}
              nodeBorderRadius={4}
              maskColor="rgba(10,10,10,0.75)"
            />
          </ReactFlow>

          {/* Run dock */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3 rounded-full border border-white/[0.08] bg-[#0a0a0b]/90 py-1.5 pl-1.5 pr-5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur">
            <button
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#ffc285] to-[#ff7a17] text-black shadow-[0_0_30px_-4px_rgba(255,122,23,0.7)] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:from-white/10 disabled:to-white/5 disabled:text-gray-500 disabled:shadow-none"
              title="Run once"
              aria-label="Run once"
            >
              {isExecuting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
            </button>
            <div className="min-w-[150px]">
              <p className="text-[13.5px] text-white">{isExecuting ? 'Running…' : 'Run once'}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#ffc285] to-[#ff7a17] transition-all duration-500" style={{ width: `${progress * 100}%` }} />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-gray-500">{doneCount}/{nodes.length}</span>
              </div>
            </div>
            {executionMessage && !isExecuting && (
              <span className="flex items-center gap-1.5 border-l border-white/10 pl-3 text-[12px] text-emerald-300">
                <Check className="h-3.5 w-3.5" /> Done
              </span>
            )}
          </div>

          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
              <button
                onClick={() => openPicker({ triggersOnly: true })}
                className="group pointer-events-auto flex items-center gap-3 rounded-2xl border-2 border-dashed border-[#ffc285]/40 bg-[#ff7a17]/[0.04] p-3 pr-6 text-left transition-all hover:border-[#ff7a17] hover:bg-[#ff7a17]/[0.08] hover:shadow-[0_0_50px_-12px_rgba(255,122,23,0.6)]"
                style={{ width: CARD_W + 36 }}
                aria-label="Add a trigger"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#ffc285]/50 text-[#ffc285] transition-transform group-hover:scale-105">
                  <Zap className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[11px] font-medium text-gray-500">1. Trigger</span>
                  <span className="block text-[14px] tracking-tight text-white">Choose a trigger</span>
                  <span className="block text-[11.5px] text-gray-500">An event that starts your workflow</span>
                </span>
              </button>
              <span className="h-8 w-px bg-white/15" />
              <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-white/10 p-3 opacity-60" style={{ width: CARD_W + 36 }}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-white/20 text-gray-500">
                  <Plus className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-[11px] font-medium text-gray-600">2. Action</span>
                  <span className="block text-[14px] tracking-tight text-gray-300">Add an action</span>
                  <span className="block text-[11.5px] text-gray-600">An event your workflow performs after it starts</span>
                </span>
              </div>
            </div>
          )}

          {/* Zapier-style "Add a step" dialog */}
          {picker && (
            <BlockPicker
              mode={picker.mode}
              categories={blockCategories}
              icons={ICON_MAP}
              hints={BLOCK_HINTS}
              onPick={addBlock}
              onClose={() => setPicker(null)}
            />
          )}

          {/* ─── Floating inspector / run sheet ─── */}
          {panelOpen && (
        <aside className="absolute bottom-3 right-3 top-16 z-20 flex w-72 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0a0a0b]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-200">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
            <SegmentTabs
              value={panelTab}
              onChange={setPanelTab}
              tabs={[
                { id: 'inspector', label: 'Inspector' },
                { id: 'run', label: `Run${runLog.length ? ` · ${runLog.length}` : ''}` },
              ]}
            />
            <button onClick={() => setPanelOpen(false)} className={ui.iconBtn} aria-label="Close panel">
              <X className="h-4 w-4" />
            </button>
          </div>

          {panelTab === 'inspector' && (
            selectedNode ? (
              <>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
                  <div className="flex items-center justify-between">
                    <MonoLabel index="◆">Selected node</MonoLabel>
                    <button onClick={() => setSelectedNode(null)} className={ui.iconBtn} aria-label="Deselect node">
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Label</label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
                      onChange={(e) => handleRenameNode(selectedNode.id, e.target.value)}
                      className="ws-field h-9 w-full px-3 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Type</label>
                    <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
                      {TYPE_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            const newType = opt.value
                            setNodes((nds) =>
                              nds.map((n) =>
                                n.id === selectedNode.id ? { ...n, data: { ...n.data, type: newType } } : n
                              )
                            )
                            setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, type: newType } })
                          }}
                          className={cn(
                            'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] transition-colors',
                            selectedNode.data.type === opt.value ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-200'
                          )}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Status</label>
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                      <StatusDot tone={selectedNode.data.status === 'running' ? 'live' : selectedNode.data.status === 'success' ? 'done' : 'idle'} />
                      <span className="text-[13px] capitalize text-white">
                        {selectedNode.data.status || 'idle'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Position</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['x', 'y'] as const).map(axis => (
                        <div key={axis} className="ws-field flex h-9 items-center gap-2 px-3">
                          <span className="font-mono text-[10.5px] uppercase text-gray-500">{axis}</span>
                          <input
                            type="number"
                            value={Math.round(selectedNode.position[axis])}
                            onChange={(e) => {
                              const p = { ...selectedNode.position, [axis]: parseInt(e.target.value) || 0 }
                              setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, position: p } : n)))
                              setSelectedNode({ ...selectedNode, position: p })
                            }}
                            className="w-full min-w-0 bg-transparent font-mono text-[12px] text-white outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Connections</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">In</p>
                        <p className="text-[15px] tabular-nums text-white">{edges.filter(e => e.target === selectedNode.id).length}</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
                        <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">Out</p>
                        <p className="text-[15px] tabular-nums text-white">{edges.filter(e => e.source === selectedNode.id).length}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={cn(ui.mono, 'mb-2 block')}>Node ID</label>
                    <p className="truncate rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-gray-500">
                      {selectedNode.id}
                    </p>
                  </div>
                </div>

                <div className="border-t border-white/[0.06] p-3">
                  <button onClick={() => handleDeleteNode(selectedNode.id)} className={cn(ui.btnDanger, 'h-9 w-full')}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Node
                  </button>
                </div>
              </>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-center">
                  <MousePointerClick className="mx-auto mb-3 h-5 w-5 text-[#ffc285]" strokeWidth={1.5} />
                  <p className="text-[13.5px] text-white">Select a node</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-gray-500">Click any block on the canvas to rename it, change its type or inspect its connections.</p>
                </div>

                <MonoLabel index="02" className="mb-3 mt-7">Workflow overview</MonoLabel>
                <div className="space-y-1.5">
                  {TYPE_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: opt.color, boxShadow: `0 0 8px ${opt.color}` }} />
                      <span className="flex-1 text-[13px] text-gray-300">{opt.plural}</span>
                      <span className="font-mono text-[12px] tabular-nums text-white">{typeCounts[opt.value]}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <span className="h-px w-2 bg-white/40" />
                    <span className="flex-1 text-[13px] text-gray-300">Connections</span>
                    <span className="font-mono text-[12px] tabular-nums text-white">{edges.length}</span>
                  </div>
                </div>

                <MonoLabel index="03" className="mb-3 mt-7">Shortcuts</MonoLabel>
                <ul className="space-y-2 text-[12px] text-gray-500">
                  <li className="flex items-center justify-between">Add a step <span className="font-mono text-[10.5px] text-gray-400">+ on a connection</span></li>
                  <li className="flex items-center justify-between">Delete selection <Kbd>⌫</Kbd></li>
                  <li className="flex items-center justify-between">Connect blocks <span className="font-mono text-[10.5px] text-gray-400">drag handle → handle</span></li>
                  <li className="flex items-center justify-between">Remove a connection <span className="font-mono text-[10.5px] text-gray-400">hover edge → ✕</span></li>
                </ul>
              </div>
            )
          )}

          {panelTab === 'run' && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <MonoLabel index="01" className="mb-3">Execution order</MonoLabel>
              <ol className="mb-7">
                {nodes.map((n, i) => {
                  const st = n.data.status || 'idle'
                  return (
                    <li key={n.id} className="relative flex items-center gap-3 pb-2.5 last:pb-0">
                      {i < nodes.length - 1 && <span className={cn('absolute left-[11px] top-6 h-[calc(100%-14px)] w-px', st === 'success' ? 'bg-emerald-400/40' : 'bg-white/[0.07]')} />}
                      <span className={cn(
                        'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                        st === 'running' && 'border-[#ff7a17]/60 bg-[#1a120b] text-[#ffc285] shadow-[0_0_14px_rgba(255,122,23,0.4)]',
                        st === 'success' && 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
                        st === 'error' && 'border-red-400/40 bg-red-500/10 text-red-300',
                        st === 'idle' && 'border-white/10 bg-[#0d0e10] text-gray-600'
                      )}>
                        {st === 'running' ? <Loader2 className="h-3 w-3 animate-spin" /> : st === 'success' ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <button
                        onClick={() => { setSelectedNode(n); setPanelTab('inspector') }}
                        className={cn('min-w-0 flex-1 truncate text-left text-[13px] transition-colors hover:text-white', st === 'idle' ? 'text-gray-400' : 'text-white')}
                      >
                        {n.data.label}
                      </button>
                    </li>
                  )
                })}
                {nodes.length === 0 && <p className="text-[12.5px] text-gray-600">No nodes on the canvas.</p>}
              </ol>

              <MonoLabel index="02" className="mb-3">Run log</MonoLabel>
              {runLog.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-center text-[12.5px] text-gray-600">
                  Press <span className="text-gray-300">Execute</span> to run the pipeline.
                </p>
              ) : (
                <ol className="space-y-0.5 rounded-xl border border-white/[0.06] bg-[#0c0d0f] p-2 font-mono text-[11px]">
                  {runLog.map((entry, i) => (
                    <li key={i} className="flex gap-2 rounded-md px-1.5 py-1 animate-in fade-in">
                      <span className="text-gray-700">{entry.t.toLocaleTimeString([], { hour12: false })}</span>
                      <span className={entry.status === 'running' ? 'text-[#ffc285]' : entry.status === 'success' ? 'text-emerald-300' : 'text-red-300'}>
                        {entry.status === 'running' ? '▸' : entry.status === 'success' ? '✓' : '✕'}
                      </span>
                      <span className="truncate text-gray-400">{entry.label}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </aside>
          )}
        </section>

      </div>
    </div>
  )
}

const BLOCK_HINTS: Record<string, string> = {
  'Upload Resume': 'Start from a CV file',
  'Upload Document': 'Start from any document',
  'Fetch API Data': 'Pull JSON from an endpoint',
  'Read Database': 'Query rows to process',
  'Extract Skills': 'Pull skills & keywords',
  'Analyze Text': 'Sentiment, entities, topics',
  'Analyze Experience': 'Score roles & seniority',
  'Summarize': 'Condense long input',
  'Generate Content': 'Draft new text with an LLM',
  'Generate Summary': 'Write a short profile',
  'Transform Data': 'Map, filter, reshape',
  'Validate Input': 'Check schema & required fields',
  'Improve Resume': 'Rewrite with suggestions',
  'Export PDF': 'Render a downloadable file',
  'Send Email': 'Deliver the result',
  'Save Database': 'Persist the output',
  'Webhook Call': 'POST to another service',
  'Display Result': 'Show output in the app',
}

const TYPE_OPTIONS = [
  { value: 'input' as const, label: 'Trigger', plural: 'Triggers', color: '#a0c3ec' },
  { value: 'process' as const, label: 'Process', plural: 'Processing', color: '#c4b5fd' },
  { value: 'output' as const, label: 'Action', plural: 'Actions', color: '#ff7a17' },
]

function CanvasButton({ icon: Icon, label, onClick, active }: { icon: LucideIcon; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn('flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/[0.08] hover:text-white', active ? 'bg-white/[0.08] text-[#ffc285]' : 'text-gray-400')}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )
}
