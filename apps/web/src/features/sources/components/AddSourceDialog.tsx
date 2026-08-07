import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PdfDropArea } from '@/features/sources/components/PdfDropArea'
import { TextSourceForm } from '@/features/sources/components/TextSourceForm'
import { UrlSourceForm } from '@/features/sources/components/UrlSourceForm'

type SourceTab = 'pdf' | 'text' | 'markdown' | 'website' | 'youtube'

const SOURCE_TABS: readonly { value: SourceTab; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: 'Text' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'website', label: 'Website' },
  { value: 'youtube', label: 'YouTube' },
]

interface AddSourceDialogProps {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPdfFiles: (files: File[]) => void
}

export function AddSourceDialog({
  workspaceId,
  open,
  onOpenChange,
  onPdfFiles,
}: AddSourceDialogProps) {
  const [tab, setTab] = useState<SourceTab>('pdf')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add source</DialogTitle>
          <DialogDescription>
            Upload a PDF, paste text, or pull in a website or YouTube video.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as SourceTab)}>
          <TabsList className="grid w-full grid-cols-5">
            {SOURCE_TABS.map((sourceTab) => (
              <TabsTrigger key={sourceTab.value} value={sourceTab.value} className="text-xs">
                {sourceTab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="pdf" className="pt-4">
            <PdfDropArea
              onFiles={(files) => {
                onPdfFiles(files)
                onOpenChange(false)
              }}
            />
          </TabsContent>
          <TabsContent value="text" className="pt-4">
            <TextSourceForm
              kind="text"
              workspaceId={workspaceId}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
          <TabsContent value="markdown" className="pt-4">
            <TextSourceForm
              kind="markdown"
              workspaceId={workspaceId}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
          <TabsContent value="website" className="pt-4">
            <UrlSourceForm
              kind="website"
              workspaceId={workspaceId}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
          <TabsContent value="youtube" className="pt-4">
            <UrlSourceForm
              kind="youtube"
              workspaceId={workspaceId}
              onDone={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
