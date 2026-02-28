import Editor from '@monaco-editor/react'

interface YamlEditorProps {
  value: string
  onChange: (value: string) => void
}

export default function YamlEditor({ value, onChange }: YamlEditorProps) {
  return (
    <Editor
      height="100%"
      defaultLanguage="yaml"
      value={value}
      onChange={(v) => onChange(v ?? '')}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        tabSize: 2,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}
