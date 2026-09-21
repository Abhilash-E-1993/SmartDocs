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
      {/* max-h so the dialog never grows beyond the viewport — content inside scrolls */}
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-lg">
        {/* Fixed header */}
        <div className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle>Add source</DialogTitle>
            <DialogDescription>
              Upload a PDF, paste text, or pull in a website or YouTube video.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as SourceTab)}
            className="flex h-full flex-col"
          >
            {/* Sticky tab bar inside the scrollable area */}
            <div className="sticky top-0 z-10 bg-background px-6 pb-2 pt-4">
              <TabsList className="grid w-full grid-cols-5">
                {SOURCE_TABS.map((sourceTab) => (
                  <TabsTrigger key={sourceTab.value} value={sourceTab.value} className="text-xs">
                    {sourceTab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="flex-1 px-6 pb-6">
              <TabsContent value="pdf" className="mt-0 pt-3">
                <PdfDropArea
                  onFiles={(files) => {
                    onPdfFiles(files)
                    onOpenChange(false)
                  }}
                />
              </TabsContent>
              <TabsContent value="text" className="mt-0 pt-3">
                <TextSourceForm
                  kind="text"
                  workspaceId={workspaceId}
                  onDone={() => onOpenChange(false)}
                />
              </TabsContent>
              <TabsContent value="markdown" className="mt-0 pt-3">
                <TextSourceForm
                  kind="markdown"
                  workspaceId={workspaceId}
                  onDone={() => onOpenChange(false)}
                />
              </TabsContent>
              <TabsContent value="website" className="mt-0 pt-3">
                <UrlSourceForm
                  kind="website"
                  workspaceId={workspaceId}
                  onDone={() => onOpenChange(false)}
                />
              </TabsContent>
              <TabsContent value="youtube" className="mt-0 pt-3">
                <UrlSourceForm
                  kind="youtube"
                  workspaceId={workspaceId}
                  onDone={() => onOpenChange(false)}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}
