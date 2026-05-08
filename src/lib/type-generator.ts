export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

type CodeMode = 'ts' | 'java' | 'python' | 'go' | 'csharp' | 'rust' | 'kotlin' | 'php' | 'swift' | 'ruby' | 'cpp'
export type TypeMode = 'json' | CodeMode

type TypeInfo = Record<CodeMode, string>

function isObject(v: JsonValue): v is Record<string, JsonValue> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isArray(v: JsonValue): v is JsonValue[] {
  return Array.isArray(v)
}

const VALUE_TYPE: TypeInfo = {
  ts: 'unknown',
  java: 'Object',
  python: 'Any',
  go: 'any',
  csharp: 'object',
  rust: 'serde_json::Value',
  kotlin: 'Any',
  php: 'mixed',
  swift: 'Any',
  ruby: 'Object',
  cpp: 'nlohmann::json',
}

function inferPrimitive(value: JsonValue): TypeInfo {
  if (value === null) {
    return {
      ts: 'null',
      java: 'Object',
      python: 'None',
      go: 'any',
      csharp: 'object',
      rust: 'serde_json::Value',
      kotlin: 'Any',
      php: 'mixed',
      swift: 'Any',
      ruby: 'NilClass',
      cpp: 'nlohmann::json',
    }
  }
  if (typeof value === 'string') {
    return {
      ts: 'string',
      java: 'String',
      python: 'str',
      go: 'string',
      csharp: 'string',
      rust: 'String',
      kotlin: 'String',
      php: 'string',
      swift: 'String',
      ruby: 'String',
      cpp: 'std::string',
    }
  }
  if (typeof value === 'boolean') {
    return {
      ts: 'boolean',
      java: 'boolean',
      python: 'bool',
      go: 'bool',
      csharp: 'bool',
      rust: 'bool',
      kotlin: 'Boolean',
      php: 'bool',
      swift: 'Bool',
      ruby: 'TrueClass | FalseClass',
      cpp: 'bool',
    }
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return {
        ts: 'number',
        java: 'int',
        python: 'int',
        go: 'int',
        csharp: 'int',
        rust: 'i64',
        kotlin: 'Int',
        php: 'int',
        swift: 'Int',
        ruby: 'Integer',
        cpp: 'int64_t',
      }
    }
    return {
      ts: 'number',
      java: 'double',
      python: 'float',
      go: 'float64',
      csharp: 'double',
      rust: 'f64',
      kotlin: 'Double',
      php: 'float',
      swift: 'Double',
      ruby: 'Float',
      cpp: 'double',
    }
  }
  return { ...VALUE_TYPE }
}

function mergeTypes(types: TypeInfo[]): TypeInfo {
  const seen = new Map<string, TypeInfo>()
  for (const t of types) seen.set(t.ts, t)
  const distinct = [...seen.values()]
  if (distinct.length === 0) return { ...VALUE_TYPE }
  if (distinct.length === 1) return distinct[0]

  const nonNull = distinct.filter((t) => t.ts !== 'null')
  if (nonNull.length === 0) {
    return {
      ts: 'null',
      java: 'Object',
      python: 'None',
      go: 'any',
      csharp: 'object',
      rust: 'serde_json::Value',
      kotlin: 'Any',
      php: 'mixed',
      swift: 'Any',
      ruby: 'NilClass',
      cpp: 'nlohmann::json',
    }
  }
  if (nonNull.length === 1) return nonNull[0]

  return {
    ts: nonNull.map((t) => t.ts).join(' | '),
    java: 'Object',
    python: 'Any',
    go: 'any',
    csharp: 'object',
    rust: 'serde_json::Value',
    kotlin: 'Any',
    php: 'mixed',
    swift: 'Any',
    ruby: 'Object',
    cpp: 'nlohmann::json',
  }
}

function hasNull(types: TypeInfo[]): boolean {
  return types.some((t) => t.ts === 'null')
}

function safeName(key: string): string {
  return key
    .replace(/[^a-zA-Z0-9_$]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase())
    .replace(/_/g, '') || 'Root'
}

function fieldName(key: string, lang: CodeMode): string {
  if (lang === 'ts') return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`
  if (lang === 'java' || lang === 'go' || lang === 'csharp' || lang === 'kotlin' || lang === 'swift' || lang === 'cpp') {
    return key
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/[^a-zA-Z0-9]/g, '_')
  }
  if (lang === 'rust' || lang === 'python' || lang === 'ruby') {
    return (
      key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_/, '') || '_'
    )
  }
  if (lang === 'php') {
    return (
      key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_/, '') || '_'
    )
  }
  return (
    key
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_/, '') || '_'
  )
}

interface FieldDescriptor {
  key: string
  type: TypeInfo
  optional: boolean
}

function extractFields(
  objects: Record<string, JsonValue>[],
  path: string,
  collect: (name: string, val: JsonValue) => TypeInfo,
): FieldDescriptor[] {
  const fieldMap = new Map<string, { types: TypeInfo[]; count: number }>()
  for (const obj of objects) {
    for (const [k, v] of Object.entries(obj)) {
      if (!fieldMap.has(k)) fieldMap.set(k, { types: [], count: 0 })
      const entry = fieldMap.get(k)!
      entry.types.push(isObject(v) || isArray(v) ? collect(k, v) : inferPrimitive(v))
      entry.count++
    }
  }
  return [...fieldMap.entries()].map(([key, { types, count }]) => ({
    key,
    type: mergeTypes(types),
    optional: count < objects.length || (count === objects.length && hasNull(types)),
  }))
}

function generateTypes(
  value: JsonValue,
  rootName: string,
  mode: TypeMode,
): string {
  const defs = new Map<string, string>()

  function collect(name: string, val: JsonValue): TypeInfo {
    if (isObject(val)) {
      const typeName = safeName(name)
      if (!defs.has(typeName)) {
        const fields = extractFields([val], name, collect)
        defs.set(typeName, formatDef(typeName, fields, mode))
      }
      return {
        ts: typeName,
        java: typeName,
        python: typeName,
        go: typeName,
        csharp: typeName,
        rust: typeName,
        kotlin: typeName,
        php: typeName,
        swift: typeName,
        ruby: typeName,
        cpp: typeName,
      }
    }
    if (isArray(val)) {
      return collectArray(name, val)
    }
    return inferPrimitive(val)
  }

  function collectArray(name: string, arr: JsonValue[]): TypeInfo {
    const objects: Record<string, JsonValue>[] = []
    const primitives: TypeInfo[] = []

    for (const item of arr) {
      if (isObject(item)) {
        objects.push(item)
      } else if (isArray(item)) {
        // nested array — recurse and treat as a type
        const inner = collectArray(name, item)
        primitives.push(inner)
      } else {
        primitives.push(inferPrimitive(item))
      }
    }

    if (objects.length > 0) {
      const typeName = safeName(name)
      if (!defs.has(typeName)) {
        const fields = extractFields(objects, name, collect)
        defs.set(typeName, formatDef(typeName, fields, mode))
      }
      const merged = mergeTypes([{
        ts: typeName,
        java: typeName,
        python: typeName,
        go: typeName,
        csharp: typeName,
        rust: typeName,
        kotlin: typeName,
        php: typeName,
        swift: typeName,
        ruby: typeName,
        cpp: typeName,
      }, ...primitives])
      return {
        ts: `${merged.ts}[]`,
        java: `List<${merged.java}>`,
        python: `list[${merged.python}]`,
        go: `[]${merged.go}`,
        csharp: `List<${merged.csharp}>`,
        rust: `Vec<${merged.rust}>`,
        kotlin: `List<${merged.kotlin}>`,
        php: `${merged.php}[]`,
        swift: `[${merged.swift}]`,
        ruby: `Array<${merged.ruby}>`,
        cpp: `std::vector<${merged.cpp}>`,
      }
    }

    // Pure primitive array
    const merged = mergeTypes(primitives)
    return {
      ts: `${merged.ts}[]`,
      java: `List<${merged.java}>`,
      python: `list[${merged.python}]`,
      go: `[]${merged.go}`,
      csharp: `List<${merged.csharp}>`,
      rust: `Vec<${merged.rust}>`,
      kotlin: `List<${merged.kotlin}>`,
      php: `${merged.php}[]`,
      swift: `[${merged.swift}]`,
      ruby: `Array<${merged.ruby}>`,
      cpp: `std::vector<${merged.cpp}>`,
    }
  }

  let rootType: TypeInfo
  if (isObject(value)) {
    rootType = collect(rootName, value)
  } else if (isArray(value)) {
    rootType = collectArray(rootName, value)
  } else {
    rootType = inferPrimitive(value)
    return formatPrimitive(rootType, mode)
  }

  const rootTypeName = safeName(rootName)
  const ordered = [rootTypeName, ...[...defs.keys()].filter((k) => k !== rootTypeName).sort()]
  const code = ordered.map((n) => defs.get(n)).filter(Boolean).join('\n\n')

  return wrapCode(code, rootType, mode)
}

function formatPrimitive(t: TypeInfo, mode: TypeMode): string {
  switch (mode) {
    case 'ts': return `type Root = ${t.ts};`
    case 'java': return `// Root is ${t.java}`
    case 'python': return `# Root is ${t.python}`
    case 'go': return `// Root is ${t.go}`
    case 'csharp': return `// Root is ${t.csharp}`
    case 'rust': return `// Root is ${t.rust}`
    case 'kotlin': return `// Root is ${t.kotlin}`
    case 'php': return `// Root is ${t.php}`
    case 'swift': return `// Root is ${t.swift}`
    case 'ruby': return `# Root is ${t.ruby}`
    case 'cpp': return `// Root is ${t.cpp}`
    default: return ''
  }
}

function formatRootTypeAlias(rootType: TypeInfo, mode: TypeMode): string {
  switch (mode) {
    case 'ts':
      return `type Root = ${rootType.ts};`
    case 'java':
      return `// Root type: ${rootType.java}`
    case 'python':
      return `# Root type: ${rootType.python}`
    case 'go':
      return `// Root type: ${rootType.go}`
    case 'csharp':
      return `// Root type: ${rootType.csharp}`
    case 'rust':
      return `// Root type: ${rootType.rust}`
    case 'kotlin':
      return `// Root type: ${rootType.kotlin}`
    case 'php':
      return `// Root type: ${rootType.php}`
    case 'swift':
      return `// Root type: ${rootType.swift}`
    case 'ruby':
      return `# Root type: ${rootType.ruby}`
    case 'cpp':
      return `// Root type: ${rootType.cpp}`
    default:
      return ''
  }
}

function wrapCode(code: string, rootType: TypeInfo, mode: TypeMode): string {
  if (!code) {
    return formatRootTypeAlias(rootType, mode)
  }
  switch (mode) {
    case 'ts':
      return code
    case 'java':
      return `import java.util.List;\n\n${code}`
    case 'python':
      return `from typing import TypedDict\n\n${code}`
    case 'go':
      return `package types\n\n${code}`
    case 'csharp':
      return `using System.Collections.Generic;\n\n${code}`
    case 'rust':
      return `use serde::{Deserialize, Serialize};\n\n${code}`
    case 'kotlin':
      return code
    case 'php':
      return `<?php\n\n${code}`
    case 'swift':
      return code
    case 'ruby':
      return code
    case 'cpp':
      return `#include <cstdint>\n#include <string>\n#include <vector>\n#include <nlohmann/json.hpp>\n\n${code}`
    default:
      return code
  }
}

function formatDef(
  name: string,
  fields: FieldDescriptor[],
  mode: TypeMode,
): string {
  switch (mode) {
    case 'ts': return formatTs(name, fields)
    case 'java': return formatJava(name, fields)
    case 'python': return formatPython(name, fields)
    case 'go': return formatGo(name, fields)
    case 'csharp': return formatCsharp(name, fields)
    case 'rust': return formatRust(name, fields)
    case 'kotlin': return formatKotlin(name, fields)
    case 'php': return formatPhp(name, fields)
    case 'swift': return formatSwift(name, fields)
    case 'ruby': return formatRuby(name, fields)
    case 'cpp': return formatCpp(name, fields)
    default: return ''
  }
}

function formatTs(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type, optional }) => {
    const opt = optional ? '?' : ''
    return `  ${fieldName(key, 'ts')}${opt}: ${type.ts};`
  })
  return `interface ${name} {\n${lines.join('\n')}\n}`
}

function formatJava(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type, optional }) => {
    const javaType = type.java
    const fname = fieldName(key, 'java')
    if (optional && !javaType.startsWith('@Nullable')) {
      return `  @Nullable private ${javaType} ${fname};`
    }
    return `  private ${javaType} ${fname};`
  })
  return `public class ${name} {\n${lines.join('\n')}\n}`
}

function formatPython(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type, optional }) => {
    const pyType = type.python
    const fname = fieldName(key, 'python')
    if (optional && !pyType.includes('None')) {
      return `  ${fname}: ${pyType} | None`
    }
    return `  ${fname}: ${pyType}`
  })
  return `class ${name}(TypedDict):\n${lines.join('\n')}`
}

function formatGo(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type }) => (
    `  ${safeName(fieldName(key, 'go'))} ${type.go} \`json:"${key}"\``
  ))
  return `type ${name} struct {\n${lines.join('\n')}\n}`
}

function formatCsharp(name: string, fields: FieldDescriptor[]): string {
  const nullableValueTypes = new Set(['int', 'double', 'bool'])
  const lines = fields.map(({ key, type, optional }) => {
    let csharpType = type.csharp
    if (optional && (nullableValueTypes.has(csharpType) || csharpType === 'string')) csharpType += '?'
    return `  public ${csharpType} ${safeName(fieldName(key, 'csharp'))} { get; set; }`
  })
  return `public class ${name}\n{\n${lines.join('\n')}\n}`
}

function formatRust(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.flatMap(({ key, type, optional }) => {
    const rustType = optional ? `Option<${type.rust}>` : type.rust
    const fname = fieldName(key, 'rust')
    return [
      `  #[serde(rename = "${key}")]`,
      `  pub ${fname}: ${rustType},`,
    ]
  })
  return `#[derive(Debug, Clone, Serialize, Deserialize)]\npub struct ${name} {\n${lines.join('\n')}\n}`
}

function formatKotlin(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type, optional }) => {
    const ktType = optional ? `${type.kotlin}?` : type.kotlin
    return `  val ${fieldName(key, 'kotlin')}: ${ktType}`
  })
  return `data class ${name}(\n${lines.join(',\n')}\n)`
}

function formatPhp(name: string, fields: FieldDescriptor[]): string {
  const scalar = new Set(['int', 'float', 'bool', 'string'])
  const lines = fields.map(({ key, type, optional }) => {
    const phpType = type.php
    const typed = scalar.has(phpType) ? phpType : (phpType === 'mixed' ? '' : phpType)
    const nullablePrefix = optional && typed ? '?' : ''
    const typeDecl = typed ? `${nullablePrefix}${typed} ` : ''
    return `  public ${typeDecl}$${fieldName(key, 'php')};`
  })
  return `class ${name}\n{\n${lines.join('\n')}\n}`
}

function formatSwift(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type, optional }) => {
    const swiftType = optional ? `${type.swift}?` : type.swift
    return `  let ${fieldName(key, 'swift')}: ${swiftType}`
  })
  return `struct ${name}: Codable {\n${lines.join('\n')}\n}`
}

function formatRuby(name: string, fields: FieldDescriptor[]): string {
  const attrs = fields.map(({ key }) => `:${fieldName(key, 'ruby')}`).join(', ')
  const lines = fields.map(({ key, type, optional }) => {
    const nameRuby = fieldName(key, 'ruby')
    const optionalTag = optional ? ', nil' : ''
    return `  # @!attribute [rw] ${nameRuby}\n  #   @return [${type.ruby}${optionalTag}]`
  })
  return `class ${name}\n${lines.join('\n')}\n  attr_accessor ${attrs}\nend`
}

function formatCpp(name: string, fields: FieldDescriptor[]): string {
  const lines = fields.map(({ key, type }) => `  ${type.cpp} ${fieldName(key, 'cpp')};`)
  return `struct ${name} {\n${lines.join('\n')}\n};`
}

export function generate(value: JsonValue, mode: TypeMode): string {
  if (mode === 'json') return ''
  return generateTypes(value, 'Root', mode)
}
