import { Handle, Position } from 'reactflow'
import { Upload, Cog, Download } from 'lucide-react'

interface WorkflowNodeProps {
  data: {
    label: string
    type: 'input' | 'process' | 'output'
  }
}

export default function WorkflowNode({ data }: WorkflowNodeProps) {
  const getNodeStyle = () => {
    switch (data.type) {
      case 'input':
        return 'bg-[#191919] border-[#a0c3ec] text-white'
      case 'output':
        return 'bg-[#191919] border-[#ff7a17] text-white'
      default:
        return 'bg-[#191919] border-[#7c3aed] text-white'
    }
  }

  const getIcon = () => {
    switch (data.type) {
      case 'input':
        return <Upload className="w-4 h-4 text-[#a0c3ec]" />
      case 'output':
        return <Download className="w-4 h-4 text-[#ff7a17]" />
      default:
        return <Cog className="w-4 h-4 text-[#c4b5fd]" />
    }
  }

  return (
    <div
      className={`px-4 py-3 rounded-lg border flex items-center gap-2.5 min-w-[160px] ${getNodeStyle()}`}
    >
      {data.type !== 'input' && (
        <Handle type="target" position={Position.Top} />
      )}

      <div className="flex items-center gap-2.5">
        {getIcon()}
        <div className="text-sm font-normal">{data.label}</div>
      </div>

      {data.type !== 'output' && (
        <Handle type="source" position={Position.Bottom} />
      )}
    </div>
  )
}
