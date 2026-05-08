import { describe, expect, it } from 'vitest'
import {
  jsonToQueryString,
  queryStringToJson,
  jsonToFormDataText,
  formDataTextToJson,
  jsonToCsv,
  csvToJson,
  jsonToYaml,
  yamlToJson,
  suggestCsvPathsFromJson,
} from '@/lib/convert-utils'

describe('convert-utils', () => {
  it('converts json <-> querystring', () => {
    const q = jsonToQueryString('{"a":"1","b":"x y","tags":["x","y"]}').text
    expect(q).toContain('a=1')
    expect(q).toContain('b=x%20y')
    expect(q).toContain('tags=x')
    expect(q).toContain('tags=y')
    const j = queryStringToJson(q, 2).text
    expect(j).toContain('"a": "1"')
    expect(j).toContain('"b": "x y"')
    expect(j).toContain('"tags": [')
  })

  it('converts json <-> formdata text', () => {
    const f = jsonToFormDataText('{"a":"1","b":"2","k":["v1","v2"]}').text
    expect(f).toContain('a=1')
    expect(f).toContain('b=2')
    expect(f).toContain('k=v1')
    expect(f).toContain('k=v2')
    const j = formDataTextToJson(f, 2).text
    expect(j).toContain('"a": "1"')
    expect(j).toContain('"b": "2"')
    expect(j).toContain('"k": [')
  })

  it('converts json <-> csv with path', () => {
    const c = jsonToCsv('{"items":[{"id":1,"name":"A"},{"id":2,"name":"B"}]}', { path: 'items' }).text
    expect(c.split('\n')[0]).toContain('id')
    expect(c.split('\n')[0]).toContain('name')
    const j = csvToJson(c, 2).text
    expect(j).toContain('"id": 1')
    expect(j).toContain('"name": "A"')
  })

  it('supports chain conversion: json -> csv -> json -> querystring', () => {
    const source = '{"items":[{"id":1,"name":"A"},{"id":2,"name":"B"}]}'
    const csv = jsonToCsv(source, { path: 'items' }).text
    const jsonAgain = csvToJson(csv, 2).text
    const query = jsonToQueryString(`{"payload":${jsonAgain}}`).text
    expect(query).toContain('payload')
    const back = queryStringToJson(query, 2).text
    expect(back).toContain('"payload.id"')
    expect(back).toContain('"payload.name"')
  })

  it('throws on empty input and invalid path', () => {
    expect(() => jsonToYaml('')).toThrow()
    expect(() => yamlToJson('', 2)).toThrow()
    expect(() => jsonToCsv('{"data":{}}', { path: 'items' })).toThrow()
    expect(() => csvToJson('', 2)).toThrow()
  })

  it('handles irregular csv columns and path suggestions', () => {
    const irregular = 'id,name\n1,A\n2'
    const parsed = csvToJson(irregular, 2).text
    expect(parsed).toContain('"name": ""')

    const suggestions = suggestCsvPathsFromJson('{"items":[{"a":1}],"nested":{"rows":[{"b":2}]}}')
    expect(suggestions).toContain('items')
    expect(suggestions).toContain('nested.rows')
  })
})

