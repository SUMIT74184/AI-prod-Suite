'use client'

import { useCallback, useState } from 'react'
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
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Play, Save, Trash2 } from 'lucide-react'
import WorkflowNode from '@/components/workflow-node'

const nodeTypes = {
  custom: WorkflowNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    data: { label: 'Upload Resume', type: 'input' },
    position: { x: 250, y: 25 },
    type: 'custom',
  },
  {
    id: '2',
    data: { label: 'Extract Skills', type: 'process' },
    position: { x: 250, y: 150 },
    type: 'custom',
  },
  {
    id: '3',
    data: { label: 'Analyze Experience', type: 'process' },
    position: { x: 100, y: 280 },
    type: 'custom',
  },
  {
    id: '4',
    data: { label: 'Generate Summary', type: 'process' },
    position: { x: 400, y: 280 },
    type: 'custom',
  },
  {
    id: '5',
    data: { label: 'Improve Resume', type: 'process' },
    position: { x: 250, y: 400 },
    type: 'custom',
  },
  {
    id: '6',
    data: { label: 'Export PDF', type: 'output' },
    position: { x: 250, y: 550 },
    type: 'custom',
  },
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

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
    },
    [setEdges]
  )

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }

  const handleAddNode = () => {
    const newNodeId = `node-${Date.now()}`
    const newNode: Node = {
      id: newNodeId,
      data: { label: 'New Step', type: 'process' },
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      type: 'custom',
    }
    setNodes((nds) => [...nds, newNode])
  }

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }

  const handleRenameNode = (nodeId: string, newLabel: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n))
    )
  }

  const handleClearWorkflow = () => {
    if (confirm('Are you sure you want to clear the entire workflow?')) {
      setNodes([])
      setEdges([])
      setSelectedNode(null)
    }
  }

  const handleExecuteWorkflow = async () => {
    console.log('Executing workflow with nodes:', nodes, 'edges:', edges)
    alert('Workflow execution started! Check console for details.')
  }

  const handleSaveWorkflow = () => {
    const workflow = { nodes, edges }
    localStorage.setItem('workflow', JSON.stringify(workflow))
    alert('Workflow saved successfully!')
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-muted/30 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Workflow Blocks</h2>
          <p className="text-xs text-muted-foreground mt-1">Drag blocks to canvas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Input Blocks */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase mb-2 opacity-60">
              Input
            </h3>
            <div className="space-y-2">
              {[
                'Upload Resume',
                'Upload Document',
                'Fetch API Data',
                'Read Database',
              ].map((label) => (
                <div
                  key={label}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData(
                      'application/reactflow',
                      JSON.stringify({ label, type: 'input' })
                    )
                  }}
                  className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs cursor-move hover:bg-blue-500/20 text-foreground truncate"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Process Blocks */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase mb-2 opacity-60">
              Process
            </h3>
            <div className="space-y-2">
              {[
                'Extract Skills',
                'Analyze Text',
                'Summarize',
                'Generate Content',
                'Transform Data',
                'Validate Input',
              ].map((label) => (
                <div
                  key={label}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData(
                      'application/reactflow',
                      JSON.stringify({ label, type: 'process' })
                    )
                  }}
                  className="p-2 bg-purple-500/10 border border-purple-500/30 rounded text-xs cursor-move hover:bg-purple-500/20 text-foreground truncate"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Output Blocks */}
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase mb-2 opacity-60">
              Output
            </h3>
            <div className="space-y-2">
              {[
                'Export PDF',
                'Send Email',
                'Save Database',
                'Webhook Call',
                'Display Result',
              ].map((label) => (
                <div
                  key={label}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData(
                      'application/reactflow',
                      JSON.stringify({ label, type: 'output' })
                    )
                  }}
                  className="p-2 bg-green-500/10 border border-green-500/30 rounded text-xs cursor-move hover:bg-green-500/20 text-foreground truncate"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-border p-3 space-y-2">
          <Button onClick={handleAddNode} variant="outline" size="sm" className="w-full gap-2">
            <Plus className="w-4 h-4" />
            Add Node
          </Button>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border p-3 bg-background flex items-center justify-between">
          <h1 className="font-semibold text-foreground">Workflow Canvas</h1>
          <div className="flex gap-2">
            <Button
              onClick={handleExecuteWorkflow}
              className="gap-2"
              size="sm"
            >
              <Play className="w-4 h-4" />
              Execute
            </Button>
            <Button
              onClick={handleSaveWorkflow}
              variant="outline"
              className="gap-2"
              size="sm"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
            <Button
              onClick={handleClearWorkflow}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </div>

      {/* Node Inspector */}
      {selectedNode && (
        <div className="w-72 border-l border-border bg-muted/30 flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Node Inspector</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Label</label>
              <input
                type="text"
                value={selectedNode.data.label}
                onChange={(e) => handleRenameNode(selectedNode.id, e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <select
                value={selectedNode.data.type}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, type: e.target.value } }
                        : n
                    )
                  )
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, type: e.target.value },
                  })
                }}
                className="w-full mt-1 px-3 py-2 rounded border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="input">Input</option>
                <option value="process">Process</option>
                <option value="output">Output</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Position</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <input
                  type="number"
                  value={Math.round(selectedNode.position.x)}
                  onChange={(e) => {
                    const newPos = { ...selectedNode.position, x: parseInt(e.target.value) }
                    setNodes((nds) =>
                      nds.map((n) => (n.id === selectedNode.id ? { ...n, position: newPos } : n))
                    )
                    setSelectedNode({ ...selectedNode, position: newPos })
                  }}
                  className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="X"
                />
                <input
                  type="number"
                  value={Math.round(selectedNode.position.y)}
                  onChange={(e) => {
                    const newPos = { ...selectedNode.position, y: parseInt(e.target.value) }
                    setNodes((nds) =>
                      nds.map((n) => (n.id === selectedNode.id ? { ...n, position: newPos } : n))
                    )
                    setSelectedNode({ ...selectedNode, position: newPos })
                  }}
                  className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Y"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border p-3">
            <Button
              onClick={() => {
                handleDeleteNode(selectedNode.id)
                setSelectedNode(null)
              }}
              variant="destructive"
              className="w-full gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Node
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
