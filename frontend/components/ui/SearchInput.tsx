'use client'
import { Search, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { debounce } from '@/lib/utils'

interface Props {
  value?: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchInput({ value = '', onChange, placeholder = 'Rechercher…' }: Props) {
  const [local, setLocal] = useState(value)

  const debouncedChange = debounce(onChange, 300)

  useEffect(() => { setLocal(value) }, [value])

  function handleChange(v: string) {
    setLocal(v)
    debouncedChange(v)
  }

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <Search size={15} style={{ position: 'absolute', left: 10, color: 'var(--foreground-subtle)', pointerEvents: 'none' }} />
      <input
        className="input-base"
        style={{ paddingLeft: '2rem', paddingRight: local ? '2rem' : '0.75rem', width: 240 }}
        placeholder={placeholder}
        value={local}
        onChange={e => handleChange(e.target.value)}
      />
      {local && (
        <button
          onClick={() => handleChange('')}
          style={{ position: 'absolute', right: 8, color: 'var(--foreground-subtle)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
