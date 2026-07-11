'use client'

import { useRef, useState } from 'react'
import { Upload, X, FileText, File } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  uploadedFiles?: File[]
  acceptedTypes?: string[]
}

export default function FileUploadZone({ onFilesSelected, uploadedFiles = [], acceptedTypes }: FileUploadZoneProps) {
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
  }

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4 text-red-500" />
    }
    return <File className="w-4 h-4 text-blue-500" />
  }

  return (
    <div className="border-t border-border px-6 py-4 bg-card space-y-3">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer',
          'flex items-center justify-center gap-3',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
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
        <Upload className="w-5 h-5 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? 'Drop files here' : 'Drag and drop or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, or TXT (max 50MB)
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles && uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Uploaded Files</p>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-background border border-border rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
