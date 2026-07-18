'use client'

import { useCallback, useState } from 'react'
export const dynamic = 'force-dynamic'
import ReactFlow, { Node, Edge, addEdge, Connection, useNodesState, useEdgesState, Background, Controls, MiniMap } from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Play, Save, Trash2 } from 'lucide-react'
import WorkflowNode from '@/components/workflow-node'

const nodeTypes = { custom: WorkflowNode }

const initialNodes: Node[] = [
  { id: '1', data: { label: 'Upload Resume', type: 'input' }, position: { x: 250, y: 25 }, type: 'custom' },
  { id: '2', data: { label: 'Extract Skills', type: 'process' }, position: { x: 250, y: 150 }, type: 'custom' },
  { id: '3', data: { label: 'Analyze Experience', type: 'process' }, position: { x: 100, y: 280 }, type: 'custom' },
  { id: '4', data: { label: 'Generate Summary', type: 'process' }, position: { x: 400, y: 280 }, type: 'custom' },
  { id: '5', data: { label: 'Improve Resume', type: 'process' }, position: { x: 250, y: 400 }, type: 'custom' },
  { id: '6', data: { label: 'Export PDF', type: 'output' }, position: { x: 250, y: 550 }, type: 'custom' },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-5', source: '3', target: '5' },
  { id: 'e4-5', source: '4', target: '5' },
  { id: 'e5-6', source: '5', target: '6' },
]

export default function WorkflowAutomationPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const onConnect = useCallback((connection: Connection) => { setEdges((eds) => addEdge(connection, eds)) }, [setEdges])
  const onNodeClick = (_event: React.MouseEvent, node: Node) => { setSelectedNode(node) }
  const handleAddNode = () => { setNodes((nds) => [...nds, { id: `node-${Date.now()}`, data: { label: 'New Step', type: 'process' }, position: { x: Math.random() * 500, y: Math.random() * 500 }, type: 'custom' }]) }
  const handleDeleteNode = (nodeId: string) => { setNodes((nds) => nds.filter((n) => n.id !== nodeId)); setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId)) }
  const handleRenameNode = (nodeId: string, newLabel: string) => { setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))) }
  const handleClearWorkflow = () => { if (confirm('Clear the entire workflow?')) { setNodes([]); setEdges([]); setSelectedNode(null) } }
  const handleExecuteWorkflow = async () => { alert('Workflow execution started!') }
  const handleSaveWorkflow = () => { localStorage.setItem('workflow', JSON.stringify({ nodes, edges })); alert('Workflow saved!') }

  const blockCategories = [
    { title: 'Input', color: '#a0c3ec', hoverBorder: 'rgba(160,195,236,0.5)', items: ['Upload Resume', 'Upload Document', 'Fetch API Data', 'Read Database'], type: 'input' },
    { title: 'Process', color: '#c4b5fd', hoverBorder: 'rgba(196,181,253,0.5)', items: ['Extract Skills', 'Analyze Text', 'Summarize', 'Generate Content', 'Transform Data', 'Validate Input'], type: 'process' },
    { title: 'Output', color: '#ff7a17', hoverBorder: 'rgba(255,122,23,0.5)', items: ['Export PDF', 'Send Email', 'Save Database', 'Webhook Call', 'Display Result'], type: 'output' },
  ]

  return (
    <div className="flex h-full bg-[#0a0a0a]">
      <div className="w-64 border-r border-[#212327] bg-[#0a0a0a] flex flex-col">
        <div className="p-4 border-b border-[#212327]">
          <h2 className="font-normal text-white text-sm">Workflow Blocks</h2>
          <p className="xai-caption-mono-sm text-[#7d8187] mt-1">Drag blocks to canvas</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {blockCategories.map((cat) => (
            <div key={cat.title}>
              <h3 className="xai-caption-mono-sm text-[#7d8187] mb-2">{cat.title}</h3>
              <div className="space-y-1.5">
                {cat.items.map((label) => (
                  <div key={label} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/reactflow', JSON.stringify({ label, type: cat.type })) }}
                    className="p-2 bg-[#191919] border border-[#212327] rounded-lg text-xs cursor-move font-normal transition-colors truncate"
                    style={{ color: cat.color }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = cat.hoverBorder)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#212327')}
                  >{label}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-[#212327] p-3">
          <Button onClick={handleAddNode} variant="outline" size="sm" className="w-full gap-2"><Plus className="w-4 h-4" />Add Node</Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b border-[#212327] p-3 bg-[#0a0a0a] flex items-center justify-between">
          <h1 className="xai-caption-mono-sm text-[#7d8187]">Workflow Canvas</h1>
          <div className="flex gap-2">
            <Button onClick={handleExecuteWorkflow} size="sm" className="gap-2"><Play className="w-4 h-4" />Execute</Button>
            <Button onClick={handleSaveWorkflow} variant="outline" size="sm" className="gap-2"><Save className="w-4 h-4" />Save</Button>
            <Button onClick={handleClearWorkflow} variant="destructive" size="sm" className="gap-2"><Trash2 className="w-4 h-4" />Clear</Button>
          </div>
        </div>
        <div className="flex-1" style={{ background: '#0a0a0a' }}>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} nodeTypes={nodeTypes} fitView>
            <Background color="#212327" gap={20} size={1} />
            <Controls />
            <MiniMap style={{ background: '#191919' }} nodeColor={() => '#fff'} maskColor="rgba(10,10,10,0.7)" />
          </ReactFlow>
        </div>
      </div>

      {selectedNode && (
        <div className="w-72 border-l border-[#212327] bg-[#0a0a0a] flex flex-col">
          <div className="p-4 border-b border-[#212327]"><h3 className="xai-caption-mono-sm text-[#7d8187]">Node Inspector</h3></div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-sm font-normal text-[#7d8187]">Label</label>
              <input type="text" value={selectedNode.data.label} onChange={(e) => handleRenameNode(selectedNode.id, e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#212327] bg-[#1a1c20] text-white text-sm focus:outline-none focus:border-[rgba(255,255,255,0.25)] font-normal" />
            </div>
            <div>
              <label className="text-sm font-normal text-[#7d8187]">Type</label>
              <select value={selectedNode.data.type} onChange={(e) => { setNodes((nds) => nds.map((n) => n.id === selectedNode.id ? { ...n, data: { ...n.data, type: e.target.value } } : n)); setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, type: e.target.value } }) }} className="w-full mt-1 px-3 py-2 rounded-lg border border-[#212327] bg-[#1a1c20] text-white text-sm focus:outline-none focus:border-[rgba(255,255,255,0.25)] font-normal">
                <option value="input">Input</option><option value="process">Process</option><option value="output">Output</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-normal text-[#7d8187]">Position</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input type="number" value={Math.round(selectedNode.position.x)} onChange={(e) => { const p = { ...selectedNode.position, x: parseInt(e.target.value) }; setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, position: p } : n))); setSelectedNode({ ...selectedNode, position: p }) }} className="px-2 py-1 rounded-lg border border-[#212327] bg-[#1a1c20] text-white text-xs focus:outline-none font-normal" placeholder="X" />
                <input type="number" value={Math.round(selectedNode.position.y)} onChange={(e) => { const p = { ...selectedNode.position, y: parseInt(e.target.value) }; setNodes((nds) => nds.map((n) => (n.id === selectedNode.id ? { ...n, position: p } : n))); setSelectedNode({ ...selectedNode, position: p }) }} className="px-2 py-1 rounded-lg border border-[#212327] bg-[#1a1c20] text-white text-xs focus:outline-none font-normal" placeholder="Y" />
              </div>
            </div>
          </div>
          <div className="border-t border-[#212327] p-3">
            <Button onClick={() => { handleDeleteNode(selectedNode.id); setSelectedNode(null) }} variant="destructive" className="w-full gap-2"><Trash2 className="w-4 h-4" />Delete Node</Button>
          </div>
        </div>
      )}
    </div>
  )
}
