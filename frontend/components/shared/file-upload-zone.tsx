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
          <span className="flex items-center gap-1 text-xs text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            Indexed ({tracked.chunkCount} chunks)
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 text-xs text-red-300">
            <AlertCircle className="w-3 h-3" />
            {tracked.error || 'Failed'}
          </span>
        )
      default:
        return (
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-gray-500">
            Pending
          </span>
        )
    }
  }

  // Determine which file list to display
  const displayFiles = trackedFiles.length > 0 ? trackedFiles : uploadedFiles.map(f => ({ file: f, status: 'pending' as FileStatus }))

  return (
    <div className="relative z-10 w-full space-y-3">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group flex cursor-pointer items-center gap-4 rounded-xl border border-dashed px-4 py-3.5 transition-all duration-200',
          isDragging
            ? 'border-[#ff7a17]/60 bg-[#ff7a17]/[0.06]'
            : 'border-white/[0.1] text-gray-500 hover:border-white/25 hover:bg-white/[0.02] hover:text-white'
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
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
          isDragging ? 'border-[#ff7a17]/40 bg-[#ff7a17]/10 text-[#ffc285]' : 'border-white/[0.08] bg-white/[0.03] text-gray-400 group-hover:text-[#ffc285]'
        )}>
          <Upload className="h-4 w-4" />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-[13.5px] text-gray-200">
            {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
            PDF, DOCX, TXT (MAX 50MB)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-3 py-2 text-[13px] text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Uploaded Files List with Status */}
      {displayFiles.length > 0 && (
        <div className="space-y-2">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-gray-500">
            Ingested Sources
          </p>
          <div className="space-y-1.5">
            {displayFiles.map((tracked, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {getFileIcon(tracked.file)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-white">{tracked.file.name}</p>
                    <p className="font-mono text-[10.5px] text-gray-600">
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
