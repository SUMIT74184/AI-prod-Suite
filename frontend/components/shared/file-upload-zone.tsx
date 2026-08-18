'use client'

import { useRef, useState } from 'react'
import { Upload, X, FileText, File, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// File validation constants
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

type FileStatus = 'pending' | 'uploading' | 'processing' | 'indexed' | 'error'

interface TrackedFile {
  file: File
  status: FileStatus
  chunkCount?: number
  error?: string
}

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  onUpload?: (file: File) => Promise<{ success: boolean; chunk_count?: number; error?: string }>
  uploadedFiles?: File[]
  trackedFiles?: TrackedFile[]
  acceptedTypes?: string[]
}

export default function FileUploadZone({
  onFilesSelected,
  onUpload,
  uploadedFiles = [],
  trackedFiles = [],
  acceptedTypes,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string>('')

  const validateFiles = (files: File[]) => {
    setError('')
    const validFiles: File[] = []

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Only PDF, DOCX, and TXT are allowed.`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large: ${file.name}. Maximum size is 50MB.`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    validateFiles(files)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    validateFiles(files)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-[#ff7a17]" />
    }
    return <File className="w-4 h-4 text-[#a0c3ec]" />
  }

  const getStatusBadge = (tracked: TrackedFile) => {
    switch (tracked.status) {
      case 'uploading':
        return (
          <span className="flex items-center gap-1 text-xs text-[#ffc285]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Uploading...
          </span>
        )
      case 'processing':
        return (
          <span className="flex items-center gap-1 text-xs text-[#ff7a17]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing chunks...
          </span>
        )
      case 'indexed':
        return (
          <span className="flex items-center gap-1 text-xs text-white">
            <CheckCircle2 className="w-3 h-3" />
            Indexed ({tracked.chunkCount} chunks)
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-[#ff4444]">
            <AlertCircle className="w-3 h-3" />
            {tracked.error || 'Failed'}
          </span>
        )
      default:
        return (
          <span className="text-xs text-[#7d8187]">
            Pending
          </span>
        )
    }
  }

  // Determine which file list to display
  const displayFiles = trackedFiles.length > 0 ? trackedFiles : uploadedFiles.map(f => ({ file: f, status: 'pending' as FileStatus }))

  return (
    <div className="px-4 py-2 bg-transparent space-y-3 relative z-10 max-w-3xl mx-auto w-full">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border border-dashed rounded-lg p-4 transition-all duration-200 cursor-pointer',
          'flex flex-col items-center justify-center gap-2',
          isDragging
            ? 'border-white bg-[rgba(255,255,255,0.05)]'
            : 'border-[#212327] hover:border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.02)] text-[#7d8187] hover:text-white'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload files"
        />
        <Upload className="w-5 h-5 mb-1 opacity-70" />
        <div className="text-center">
          <p className="text-sm font-normal text-inherit">
            {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
          </p>
          <p className="xai-caption-mono-sm text-[#7d8187] mt-1.5">
            PDF, DOCX, TXT (MAX 50MB)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-[#ff4444] bg-[rgba(255,68,68,0.1)] px-3 py-2 rounded-lg border border-[rgba(255,68,68,0.2)]">
          {error}
        </div>
      )}

      {/* Uploaded Files List with Status */}
      {displayFiles.length > 0 && (
        <div className="space-y-2">
          <p className="xai-caption-mono-sm text-[#7d8187]">
            Ingested Sources
          </p>
          <div className="space-y-1.5">
            {displayFiles.map((tracked, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 bg-[#191919] border border-[#212327] rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(tracked.file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-white truncate">{tracked.file.name}</p>
                    <p className="text-xs text-[#7d8187]">
                      {(tracked.file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                {getStatusBadge(tracked)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
