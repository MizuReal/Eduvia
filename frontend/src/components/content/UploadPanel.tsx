import { useState } from 'react'
import { ConfirmDeleteDialog } from '../teacher/ConfirmDeleteDialog'
import { EditPresentationDialog } from './EditPresentationDialog'
import { PresentationCard } from './PresentationCard'
import { PresentationUploadForm } from './PresentationUploadForm'
import { deleteContent } from '../../services/topicContentService'
import type { PresentationContentItem } from '../../types/topicContent'

type UploadPanelProps = {
  topicId: string
  accessToken: string
  upload: PresentationContentItem | null
  onChanged: (item: PresentationContentItem | null) => void
}

export function UploadPanel({
  topicId,
  accessToken,
  upload,
  onChanged,
}: UploadPanelProps) {
  const [isReplacing, setIsReplacing] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!upload || isReplacing) {
    return (
      <PresentationUploadForm
        topicId={topicId}
        accessToken={accessToken}
        heading={upload ? 'Replace presentation' : 'Upload presentation'}
        description={
          upload
            ? 'Upload a new PPTX or PDF. The original file is replaced after the new upload is ready, and student slide previews are prepared automatically.'
            : 'Keep the original PPTX or PDF and add a summary for learners. Student slide previews are prepared automatically.'
        }
        submitLabel={upload ? 'Replace presentation' : 'Upload presentation'}
        initialTitle={upload?.title}
        initialSummary={upload?.summary}
        onCancel={upload ? () => setIsReplacing(false) : undefined}
        onUploaded={(item) => {
          if (item.kind !== 'presentation') {
            return
          }

          setIsReplacing(false)
          onChanged(item)
        }}
      />
    )
  }

  return (
    <>
      <PresentationCard
        item={upload}
        accessToken={accessToken}
        onEdit={() => setIsEditing(true)}
        onReplace={() => setIsReplacing(true)}
        onDelete={() => setIsDeleting(true)}
      />

      {isEditing && (
        <EditPresentationDialog
          item={upload}
          accessToken={accessToken}
          onClose={() => setIsEditing(false)}
          onUpdated={(item) => {
            setIsEditing(false)
            onChanged(item)
          }}
        />
      )}

      {isDeleting && (
        <ConfirmDeleteDialog
          title="Remove presentation?"
          description={`Remove “${upload.title}” and its uploaded file from this topic?`}
          onConfirm={async () => {
            await deleteContent(upload.id, accessToken)
            setIsDeleting(false)
            onChanged(null)
          }}
          onClose={() => setIsDeleting(false)}
        />
      )}
    </>
  )
}
