import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Upload, FileText, Loader2, Trash2, CheckCircle2, Clock, AlertCircle, Plus, BookOpen } from 'lucide-react'
import type { Document } from '@/types/database'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ExtractionReviewModal } from './ExtractionReviewModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DocumentsTabProps {
  courseId: string
  documents: Document[]
  onUploadComplete: () => Promise<void>
  onProcessingComplete: () => void
  onOpenAssignmentsTab?: () => void
}

type ExtractionStatus = 'uploading' | 'processing' | 'success' | 'partial' | 'error' | null

interface ExtractionResult {
  status: ExtractionStatus
  documentId: string | null
  assignmentsExtracted: number
  chunksCreated: number
  message: string
}

type DocumentType = 'syllabus' | 'study_resource'

export function DocumentsTab({ courseId, documents, onUploadComplete, onProcessingComplete, onOpenAssignmentsTab }: DocumentsTabProps) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processing, setProcessing] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('syllabus')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [extractedAssignments, setExtractedAssignments] = useState<any[]>([])
  const [_extractionDocumentId, setExtractionDocumentId] = useState<string | null>(null)

  // Calculate counts
  const syllabusCount = documents.filter(d => d.document_type === 'syllabus').length
  const studyResourceCount = documents.filter(d => d.document_type === 'study_resource').length
  const canUploadSyllabus = syllabusCount < 1
  const canUploadStudyResource = studyResourceCount < 3

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      await handleUpload(files[0])
    }
  }, [])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      await handleUpload(files[0])
    }
  }

  const handleUpload = async (file: File) => {
    if (!user) return

    // Validate file type
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    // Validate limits
    if (documentType === 'syllabus' && !canUploadSyllabus) {
      toast.error('Maximum 1 syllabus per course. Delete the existing syllabus first.')
      return
    }
    if (documentType === 'study_resource' && !canUploadStudyResource) {
      toast.error('Maximum 3 study resources reached. Delete an existing resource to upload a new one.')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setExtractionResult(null)

    try {
      // Create file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const filePath = `${user.id}/${courseId}/${crypto.randomUUID()}.${fileExt}`

      // Upload to Supabase Storage
      setUploadProgress(30)
      const { error: uploadError } = await supabase.storage
        .from('course_materials')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      setUploadProgress(60)

      // Create document record with document_type
      const { data: doc, error: dbError } = await supabase
        .from('documents')
        .insert({
          course_id: courseId,
          file_path: filePath,
          file_name: file.name,
          file_type: fileExt,
          document_type: documentType,
          processed: documentType === 'study_resource', // Study resources are marked processed immediately
        } as any)
        .select()
        .single()

      if (dbError) throw dbError

      setUploadProgress(100)
      
      if (documentType === 'syllabus') {
        toast.success(`${file.name} uploaded as Syllabus. Processing...`)
        await onUploadComplete()
        // Trigger processing for syllabus
        if (doc) {
          setExtractionResult({
            status: 'uploading',
            documentId: (doc as any).id,
            assignmentsExtracted: 0,
            chunksCreated: 0,
            message: 'Uploading...'
          })
          await processDocument((doc as any).id)
        }
      } else {
        toast.success(`${file.name} uploaded as Study Resource`)
        await onUploadComplete()
      }
    } catch (err: any) {
      console.error('Upload error:', err)
      if (err.code === '23505') {
        // Unique constraint violation (syllabus limit)
        toast.error('Maximum 1 syllabus per course. Delete the existing syllabus first.')
      } else {
        toast.error('Failed to upload file')
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const processDocument = async (documentId: string) => {
    setProcessing(documentId)
    setExtractionResult({
      status: 'processing',
      documentId,
      assignmentsExtracted: 0,
      chunksCreated: 0,
      message: 'Processing syllabus...'
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: { document_id: documentId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      })

      if (error) throw error

      // Parse response
      const result = data as {
        success?: boolean
        assignments_extracted?: number
        chunks_created?: number
        partial?: boolean
        error?: string
      }

      const assignmentsCount = result.assignments_extracted || 0
      const chunksCount = result.chunks_created || 0
      const isPartial = result.partial || false

      // Log extraction details for debugging
      console.log('Document extraction result:', {
        documentId,
        fileName: documents.find(d => d.id === documentId)?.file_name,
        assignmentsExtracted: assignmentsCount,
        chunksCreated: chunksCount,
        partial: isPartial,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })

      // Fetch extracted assignments to show in review modal
      if (assignmentsCount > 0) {
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(assignmentsCount)

        if (assignmentsData && assignmentsData.length > 0) {
          // Convert to format expected by review modal
          const formattedAssignments = assignmentsData.map(a => ({
            title: a.title,
            due_date: a.due_date.split('T')[0], // Extract date part
            type: a.type,
            weight: a.weight_percentage || a.weight || null,
            id: a.id, // Keep ID for updates/deletes
          }))
          
          setExtractedAssignments(formattedAssignments)
          setExtractionDocumentId(documentId)
          setReviewModalOpen(true)
        }
      }

      if (assignmentsCount === 0) {
        // Failed extraction
        setExtractionResult({
          status: 'error',
          documentId,
          assignmentsExtracted: 0,
          chunksCreated: chunksCount,
          message: 'Could not extract assignments - Try uploading a clearer syllabus or add manually'
        })
        toast.error('Could not extract assignments from syllabus')
      } else if (isPartial || assignmentsCount < 3) {
        // Partial success
        setExtractionResult({
          status: 'partial',
          documentId,
          assignmentsExtracted: assignmentsCount,
          chunksCreated: chunksCount,
          message: `Extraction incomplete - Found ${assignmentsCount} assignment${assignmentsCount !== 1 ? 's' : ''}. Please review and add missing items manually.`
        })
        toast.warning(`Found ${assignmentsCount} assignment${assignmentsCount !== 1 ? 's' : ''}. Please review.`)
      } else {
        // Success
        setExtractionResult({
          status: 'success',
          documentId,
          assignmentsExtracted: assignmentsCount,
          chunksCreated: chunksCount,
          message: `Found ${assignmentsCount} assignment${assignmentsCount !== 1 ? 's' : ''}, ${chunksCount} topic${chunksCount !== 1 ? 's' : ''}`
        })
        toast.success(`Found ${assignmentsCount} assignment${assignmentsCount !== 1 ? 's' : ''}! Please review.`)
      }

      onProcessingComplete()
    } catch (err: any) {
      console.error('Processing error:', {
        documentId,
        fileName: documents.find(d => d.id === documentId)?.file_name,
        error: err.message || err,
        userId: user?.id,
        timestamp: new Date().toISOString()
      })
      
      setExtractionResult({
        status: 'error',
        documentId,
        assignmentsExtracted: 0,
        chunksCreated: 0,
        message: 'Could not extract assignments - Try uploading a clearer syllabus or add manually'
      })
      toast.error('Failed to process document. Please try again.')
    } finally {
      setProcessing(null)
      await onUploadComplete()
    }
  }

  const handleDeleteClick = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!documentToDelete) return

    try {
      // Delete from storage
      await supabase.storage.from('course_materials').remove([documentToDelete.file_path])
      
      // Delete from database (will cascade delete chunks)
      const { error } = await supabase.from('documents').delete().eq('id', documentToDelete.id)
      
      if (error) throw error
      
      toast.success('Document deleted')
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
      await onUploadComplete()
    } catch (err) {
      console.error('Delete error:', err)
      toast.error('Failed to delete document')
    }
  }

  const getFileIcon = (_fileType: string) => {
    return <FileText className="w-5 h-5" />
  }

  const getDocumentTypeBadge = (doc: Document) => {
    const docType = doc.document_type || 'syllabus' // Default to syllabus for backward compatibility
    if (docType === 'syllabus') {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-600 border-blue-200">
          📄 Syllabus
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1 bg-green-50 text-green-600 border-green-200">
        📚 Study Resource
      </Badge>
    )
  }

  const getStatusBadge = (doc: Document) => {
    const docType = doc.document_type || 'syllabus'
    
    // Study resources don't show processing state
    if (docType === 'study_resource') {
      return (
        <Badge variant="outline" className="gap-1 bg-green-50 text-green-600 border-green-200">
          <CheckCircle2 className="w-3 h-3" />
          Processed
        </Badge>
      )
    }

    // Syllabus processing states
    if (processing === doc.id) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Processing
        </Badge>
      )
    }
    if (doc.processed) {
      return (
        <Badge variant="outline" className="gap-1 bg-green-50 text-green-600 border-green-200">
          <CheckCircle2 className="w-3 h-3" />
          Processed
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {uploading ? (
            <>
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-lg font-medium mb-2">Uploading...</p>
              <Progress value={uploadProgress} className="w-48 h-2" />
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Upload Document</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Drag and drop your document here, or click to browse.
                Supports PDF, DOCX, and TXT files.
              </p>
              
              {/* Document Type Selection */}
              <div className="w-full max-w-md mb-4">
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={documentType === 'syllabus' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDocumentType('syllabus')}
                    disabled={!canUploadSyllabus && syllabusCount > 0}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Syllabus
                  </Button>
                  <Button
                    type="button"
                    variant={documentType === 'study_resource' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setDocumentType('study_resource')}
                    disabled={!canUploadStudyResource}
                    className="flex-1"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Study Resource
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground text-center">
                  {documentType === 'syllabus' ? (
                    <span>You can upload 1 syllabus per course. Current: {syllabusCount}/1</span>
                  ) : (
                    <span>You can upload up to 3 study resources. Current: {studyResourceCount}/3</span>
                  )}
                </div>
              </div>

              <label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={documentType === 'syllabus' && !canUploadSyllabus || documentType === 'study_resource' && !canUploadStudyResource}
                />
                <Button 
                  asChild
                  disabled={documentType === 'syllabus' && !canUploadSyllabus || documentType === 'study_resource' && !canUploadStudyResource}
                >
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </span>
                </Button>
              </label>
            </>
          )}
        </CardContent>
      </Card>

      {/* Extraction Status Messages */}
      {extractionResult && extractionResult.status !== null && (
        <Card>
          <CardContent className="pt-6">
            {extractionResult.status === 'uploading' && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm">{extractionResult.message}</p>
              </div>
            )}
            {extractionResult.status === 'processing' && (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm">{extractionResult.message}</p>
              </div>
            )}
            {extractionResult.status === 'success' && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Extraction Successful</AlertTitle>
                <AlertDescription>
                  {extractionResult.message}
                </AlertDescription>
              </Alert>
            )}
            {extractionResult.status === 'partial' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Extraction Incomplete</AlertTitle>
                <AlertDescription>
                  {extractionResult.message}
                </AlertDescription>
              </Alert>
            )}
            {extractionResult.status === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Extraction Failed</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{extractionResult.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Try uploading a PDF with clear text (not scanned image) or add assignments manually.
                  </p>
                  <div className="flex gap-2 pt-2">
                    {extractionResult.documentId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => extractionResult.documentId && processDocument(extractionResult.documentId)}
                      >
                        <Loader2 className="w-4 h-4 mr-2" />
                        Retry Extraction
                      </Button>
                    )}
                    {onOpenAssignmentsTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onOpenAssignmentsTab}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Manually
                      </Button>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uploaded Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? 's' : ''} in this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No documents uploaded yet. Upload a syllabus to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Document Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map(doc => {
                  const docType = doc.document_type || 'syllabus'
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type)}
                          <span className="font-medium truncate max-w-[200px]">
                            {doc.file_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="uppercase text-xs">
                          {doc.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getDocumentTypeBadge(doc)}</TableCell>
                      <TableCell>{getStatusBadge(doc)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {docType === 'syllabus' && !doc.processed && processing !== doc.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => processDocument(doc.id)}
                            >
                              Process
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(doc)}
                            disabled={processing === doc.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Extraction Review Modal */}
      <ExtractionReviewModal
        open={reviewModalOpen}
        onOpenChange={(open) => {
          setReviewModalOpen(open)
          if (!open) {
            setExtractedAssignments([])
            setExtractionDocumentId(null)
          }
        }}
        courseId={courseId}
        extractedAssignments={extractedAssignments}
        onConfirm={async (_assignments) => {
          // Refresh assignments list
          await onProcessingComplete()
          if (onOpenAssignmentsTab) {
            onOpenAssignmentsTab()
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              {documentToDelete?.document_type === 'syllabus' 
                ? 'Deleting the syllabus will disable AI features (chat, assessment extraction). Continue?'
                : 'Are you sure you want to delete this study resource?'}
            </DialogDescription>
          </DialogHeader>
          {documentToDelete && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                File: <strong>{documentToDelete.file_name}</strong>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteDialogOpen(false)
              setDocumentToDelete(null)
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

