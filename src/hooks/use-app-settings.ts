import { useCallback, useEffect, useMemo, useState } from 'react'
import { readStorageJson, writeStorageJson } from '@/lib/storage'
import type { JsonFormatLineEnding } from '@/lib/json-utils'
import type { TypeMode } from '@/lib/type-generator'

export type HeaderBarPosition = 'top' | 'bottom'
export type CodeTheme = 'classic' | 'ocean' | 'mono' | 'forest' | 'sunset' | 'neon'

export interface AppSettingsV1 {
  version: 1
  autoFormat: boolean
  historyDefaultOpen: boolean
  defaultTypeMode: TypeMode
  editorFontSize: number
  headerBarPosition: HeaderBarPosition
  formatIndentSpaces: 2 | 4 | 8
  formatUseTabIndent: boolean
  formatLineEnding: JsonFormatLineEnding
  formatTrailingNewline: boolean
  codeTheme: CodeTheme
}

export type AppSettings = AppSettingsV1

export const CURRENT_SETTINGS_VERSION = 1 as const

export const DEFAULT_SETTINGS: AppSettingsV1 = {
  version: 1,
  autoFormat: true,
  historyDefaultOpen: false,
  defaultTypeMode: 'json',
  editorFontSize: 12,
  headerBarPosition: 'top',
  formatIndentSpaces: 2,
  formatUseTabIndent: false,
  formatLineEnding: 'lf',
  formatTrailingNewline: false,
  codeTheme: 'classic',
}

type LegacySettings = Partial<Omit<AppSettingsV1, 'version'>> & { version?: number }

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null
}

function normalizeTypeMode(value: unknown): TypeMode {
  return (
    value === 'ts' ||
    value === 'java' ||
    value === 'python' ||
    value === 'go' ||
    value === 'csharp' ||
    value === 'rust' ||
    value === 'kotlin' ||
    value === 'php' ||
    value === 'swift' ||
    value === 'ruby' ||
    value === 'cpp' ||
    value === 'json'
  ) ? value : DEFAULT_SETTINGS.defaultTypeMode
}

export function migrateAppSettings(input: unknown): { settings: AppSettingsV1; didMigrate: boolean } {
  if (!isObject(input)) {
    return { settings: DEFAULT_SETTINGS, didMigrate: false }
  }

  const parsed = input as LegacySettings
  const fromVersion = typeof parsed.version === 'number' ? parsed.version : 0

  const sp = parsed.formatIndentSpaces
  const formatIndentSpaces: 2 | 4 | 8 = sp === 4 || sp === 8 ? sp : DEFAULT_SETTINGS.formatIndentSpaces

  const rawTheme = parsed.codeTheme
  const codeTheme: CodeTheme = (
    rawTheme === 'ocean' ||
    rawTheme === 'mono' ||
    rawTheme === 'forest' ||
    rawTheme === 'sunset' ||
    rawTheme === 'neon'
  ) ? rawTheme : DEFAULT_SETTINGS.codeTheme

  const headerBarPosition: HeaderBarPosition = parsed.headerBarPosition === 'bottom' ? 'bottom' : 'top'
  const formatLineEnding: JsonFormatLineEnding = parsed.formatLineEnding === 'crlf' ? 'crlf' : 'lf'
  const defaultTypeMode = normalizeTypeMode(parsed.defaultTypeMode)

  const settings: AppSettingsV1 = {
    version: 1,
    autoFormat: parsed.autoFormat ?? DEFAULT_SETTINGS.autoFormat,
    historyDefaultOpen: parsed.historyDefaultOpen ?? DEFAULT_SETTINGS.historyDefaultOpen,
    defaultTypeMode,
    editorFontSize: parsed.editorFontSize ?? DEFAULT_SETTINGS.editorFontSize,
    headerBarPosition,
    formatIndentSpaces,
    formatUseTabIndent: Boolean(parsed.formatUseTabIndent),
    formatLineEnding,
    formatTrailingNewline: Boolean(parsed.formatTrailingNewline),
    codeTheme,
  }

  const didMigrate = fromVersion !== CURRENT_SETTINGS_VERSION
  return { settings, didMigrate }
}

export function useAppSettings(storageKey: string) {
  const [settings, setSettings] = useState<AppSettingsV1>(DEFAULT_SETTINGS)

  useEffect(() => {
    const raw = readStorageJson<unknown>(storageKey)
    const next = migrateAppSettings(raw)
    setSettings(next.settings)
    if (next.didMigrate) {
      writeStorageJson(storageKey, next.settings)
    }
  }, [storageKey])

  useEffect(() => {
    writeStorageJson(storageKey, settings)
  }, [storageKey, settings])

  const updateSettings = useCallback((updater: (prev: AppSettingsV1) => AppSettingsV1) => {
    setSettings((prev) => migrateAppSettings(updater(prev)).settings)
  }, [])

  const derived = useMemo(
    () => ({
      defaultTypeMode: settings.defaultTypeMode,
      historyDefaultOpen: settings.historyDefaultOpen,
    }),
    [settings.defaultTypeMode, settings.historyDefaultOpen],
  )

  return { settings, setSettings, updateSettings, derived }
}

