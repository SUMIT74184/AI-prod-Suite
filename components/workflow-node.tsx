import { Handle, Position } from 'reactflow'
import { Upload, Cog, Download } from 'lucide-react'

interface WorkflowNodeProps {
  data: {
    label: string
    type: 'input' | 'process' | 'output'
  }
}

export default function WorkflowNode({ data }: WorkflowNodeProps) {
  const getNodeColor = () => {
    switch (data.type) {
      case 'input':
        return 'bg-blue-500/20 border-blue-500 text-blue-900 dark:text-blue-200'
      case 'output':
        return 'bg-green-500/20 border-green-500 text-green-900 dark:text-green-200'
      default:
        return 'bg-purple-500/20 border-purple-500 text-purple-900 dark:text-purple-200'
    }
  }

  const getIcon = () => {
    switch (data.type) {
      case 'input':
        return <Upload className="w-4 h-4" />
      case 'output':
        return <Download className="w-4 h-4" />
      default:
        return <Cog className="w-4 h-4" />
    }
  }

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md flex items-center gap-2 min-w-[160px] ${getNodeColor()}`}
    >
      {data.type !== 'input' && (
        <Handle type="target" position={Position.Top} />
      )}

      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="text-sm font-semibold">{data.label}</div>
      </div>

      {data.type !== 'output' && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
