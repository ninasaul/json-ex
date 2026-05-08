import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, migrateAppSettings } from '@/hooks/use-app-settings'

describe('use-app-settings migrateAppSettings', () => {
  it('returns defaults for non-object input', () => {
    expect(migrateAppSettings(null).settings).toEqual(DEFAULT_SETTINGS)
    expect(migrateAppSettings('x').settings).toEqual(DEFAULT_SETTINGS)
  })

  it('migrates legacy settings without version', () => {
    const { settings, didMigrate } = migrateAppSettings({
      autoFormat: false,
      historyDefaultOpen: true,
      formatIndentSpaces: 8,
      formatLineEnding: 'crlf',
      codeTheme: 'neon',
    })
    expect(didMigrate).toBe(true)
    expect(settings.version).toBe(1)
    expect(settings.autoFormat).toBe(false)
    expect(settings.historyDefaultOpen).toBe(true)
    expect(settings.formatIndentSpaces).toBe(8)
    expect(settings.formatLineEnding).toBe('crlf')
    expect(settings.codeTheme).toBe('neon')
  })

  it('normalizes invalid values', () => {
    const { settings } = migrateAppSettings({
      version: 1,
      formatIndentSpaces: 3,
      formatLineEnding: 'weird',
      headerBarPosition: 'left',
      codeTheme: 'pink',
      defaultTypeMode: 'haskell',
    })
    expect(settings.formatIndentSpaces).toBe(DEFAULT_SETTINGS.formatIndentSpaces)
    expect(settings.formatLineEnding).toBe(DEFAULT_SETTINGS.formatLineEnding)
    expect(settings.headerBarPosition).toBe(DEFAULT_SETTINGS.headerBarPosition)
    expect(settings.codeTheme).toBe(DEFAULT_SETTINGS.codeTheme)
    expect(settings.defaultTypeMode).toBe(DEFAULT_SETTINGS.defaultTypeMode)
  })
})

