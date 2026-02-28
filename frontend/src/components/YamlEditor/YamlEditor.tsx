import Editor, { type Monaco } from '@monaco-editor/react'
import { registerBBDSLLanguage } from '../../lib/bbdsl-language'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}

export default function YamlEditor({ value, onChange, readOnly = false }: YamlEditorProps) {
  function handleEditorWillMount(monaco: Monaco) {
    registerBBDSLLanguage(monaco)
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="bbdsl"
      language="bbdsl"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="bbdsl-dark"
      beforeMount={handleEditorWillMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        tabSize: 2,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        readOnly,
      }}
    />
  )
}
