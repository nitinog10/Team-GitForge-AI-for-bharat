'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useHydration, useUIStore } from '@/lib/store'
import { AuthProvider } from '@/components/AuthProvider'

function StoreHydration() {
  useHydration()
  return null
}

function ThemeSync() {
  const theme = useUIStore((s) => s.theme)
  const accentColor = useUIStore((s) => s.accentColor)
  const fontSize = useUIStore((s) => s.fontSize)
  const reducedMotion = useUIStore((s) => s.reducedMotion)

  useEffect(() => {
    const root = document.documentElement

    // Resolve effective theme
    let effective: 'dark' | 'light' = 'dark'
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } else {
      effective = theme
    }
    root.classList.toggle('dark', effective === 'dark')
    root.classList.toggle('light', effective === 'light')
    root.setAttribute('data-theme', effective)

    // Convert hex accent color to RGB and set --dv-accent
    const hex = accentColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    root.style.setProperty('--dv-accent', `${r} ${g} ${b}`)
    // Lighten for hover variant
    const rH = Math.min(255, r + 40)
    const gH = Math.min(255, g + 30)
    const bH = Math.min(255, b + 20)
    root.style.setProperty('--dv-accent-hover', `${rH} ${gH} ${bH}`)
    root.style.setProperty('--dv-accent-subtle', `rgba(${r},${g},${b},0.12)`)

    // Font size class
    root.classList.toggle('text-sm-ui', fontSize === 'small')
    root.classList.toggle('text-lg-ui', fontSize === 'large')

    // Reduced motion
    root.classList.toggle('reduce-motion', reducedMotion)

    // Listen for system theme changes
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        root.classList.toggle('dark', e.matches)
        root.classList.toggle('light', !e.matches)
        root.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme, accentColor, fontSize, reducedMotion])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <StoreHydration />
      <ThemeSync />
      <AuthProvider>
        {children}
      </AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--backdrop-tint)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            color: 'rgb(var(--dv-text))',
            border: '1px solid var(--dv-border)',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '500',
            padding: '12px 16px',
            boxShadow: 'var(--card-shadow, 0 8px 32px rgba(0,0,0,0.4))',
          },
          success: {
            iconTheme: {
              primary: 'rgb(var(--dv-success))',
              secondary: 'rgb(var(--dv-surface))',
            },
          },
          error: {
            iconTheme: {
              primary: 'rgb(var(--dv-error))',
              secondary: 'rgb(var(--dv-surface))',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}

