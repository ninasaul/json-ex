import { Panel, Group, Separator as ResizeHandle } from 'react-resizable-panels'
import type { Lang } from '@/lib/i18n'
import type { ReactNode } from 'react'

export interface JsonexMainLayoutProps {
  workMode: 'format' | 'diff'
  lang: Lang

  columnHandleClassDiff: string
  columnHandleClassFormat: string
  rowHandleClassDiff: string

  resizePanelsBetweenSourceResultAria: string

  source: ReactNode
  compareRight: ReactNode
  result: ReactNode
}

export function JsonexMainLayout({
  workMode,
  lang,
  columnHandleClassDiff,
  columnHandleClassFormat,
  rowHandleClassDiff,
  resizePanelsBetweenSourceResultAria,
  source,
  compareRight,
  result,
}: JsonexMainLayoutProps) {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {workMode === 'diff' ? (
        <Group orientation="vertical" className="min-h-0 flex-1">
          <Panel defaultSize={52} minSize={26} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
            <Group orientation="horizontal" className="min-h-0 flex-1">
              <Panel id="panel-source" defaultSize={50} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
                {source}
              </Panel>
              <ResizeHandle
                id="resize-diff-lr"
                aria-label={lang === 'zh' ? '调整左右宽度' : 'Resize columns'}
                className={columnHandleClassDiff}
              />
              <Panel defaultSize={50} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
                {compareRight}
              </Panel>
            </Group>
          </Panel>
          <ResizeHandle
            id="resize-diff-vertical"
            aria-label={lang === 'zh' ? '调整上下区域' : 'Resize split'}
            className={rowHandleClassDiff}
          />
          {result}
        </Group>
      ) : (
        <Group orientation="horizontal" className="min-h-0 flex-1">
          <Panel id="panel-source" defaultSize={52} minSize={22} className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ overflow: 'hidden' }}>
            {source}
          </Panel>
          <ResizeHandle
            id="resize-jsonex-panels"
            aria-label={resizePanelsBetweenSourceResultAria}
            className={columnHandleClassFormat}
          />
          {result}
        </Group>
      )}
    </main>
  )
}
