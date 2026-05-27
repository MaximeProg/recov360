'use client'
import { useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 420, md: 540, lg: 740 }

export default function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  /*
    On utilise createPortal pour attacher la modal DIRECTEMENT sur <body>,
    en dehors de toute arborescence React/CSS de l'app.
    Cela contourne tous les problèmes de contexte d'empilement (stacking context)
    causés par le header sticky, le sidebar, ou tout transform/z-index imbriqué.
  */
  const modal = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '14px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.30)',
          width: '100%',
          maxWidth: sizes[size],
          maxHeight: 'calc(100vh - 6rem)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.18s ease',
        }}
      >
        {/* En-tête — toujours visible, ne scrolle jamais */}
        {title && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.125rem 1.375rem',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '7px',
                border: 'none', background: 'transparent',
                color: 'var(--foreground-muted)', cursor: 'pointer',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Corps — flex: 1 + minHeight: 0 pour que overflow-y fonctionne dans un flex container */}
        <div style={{
          padding: '1.375rem',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}>
          {children}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
