'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User,
  Palette,
  CreditCard,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Check,
  Sparkles,
  Type,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { useUserStore, useUIStore, type ThemeMode, type AccentColor, type FontSize } from '@/lib/store'
import { auth } from '@/lib/api'

const ease = [0.25, 0.1, 0.25, 1] as const

const accentOptions: { color: AccentColor; label: string }[] = [
  { color: '#0a84ff', label: 'Blue' },
  { color: '#bf5af2', label: 'Purple' },
  { color: '#ff9f0a', label: 'Orange' },
  { color: '#30d158', label: 'Green' },
  { color: '#ff375f', label: 'Pink' },
  { color: '#5e5ce6', label: 'Indigo' },
  { color: '#64d2ff', label: 'Cyan' },
]

const fontSizeOptions: { id: FontSize; label: string; desc: string }[] = [
  { id: 'small', label: 'Small', desc: 'Compact interface' },
  { id: 'default', label: 'Default', desc: 'Standard sizing' },
  { id: 'large', label: 'Large', desc: 'Easier to read' },
]

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('account')
  const [mounted, setMounted] = useState(false)
  const user = useUserStore((s) => s.user)
  const token = useUserStore((s) => s.token)
  const setUser = useUserStore((s) => s.setUser)

  // Appearance — wired to Zustand store (persisted)
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)
  const accentColor = useUIStore((s) => s.accentColor)
  const setAccentColor = useUIStore((s) => s.setAccentColor)
  const fontSize = useUIStore((s) => s.fontSize)
  const setFontSize = useUIStore((s) => s.setFontSize)
  const reducedMotion = useUIStore((s) => s.reducedMotion)
  const setReducedMotion = useUIStore((s) => s.setReducedMotion)



  useEffect(() => { setMounted(true) }, [])

  // Fetch user info from API if we have a token but no user data
  useEffect(() => {
    if (token && !user) {
      auth.getMe().then((data) => {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          avatarUrl: data.avatar_url,
        })
      }).catch(() => {})
    }
  }, [token, user, setUser])

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ]

  if (!mounted) {
    return (
      <div className="min-h-screen bg-dv-bg flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-dv-accent/30 border-t-dv-accent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dv-bg flex text-dv-text selection:bg-dv-accent/30">
      <Sidebar />

      <main className="flex-1 overflow-y-auto relative">
        {/* Ambient glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden ambient-glows">
          <div className="absolute top-[-20%] right-[10%] w-[600px] h-[400px] bg-dv-indigo/[0.03] rounded-full blur-[140px]" />
          <div className="absolute bottom-[-15%] left-[25%] w-[500px] h-[400px] bg-dv-accent/[0.025] rounded-full blur-[120px]" />
        </div>

        {/* Frosted top bar */}
        <div className="sticky top-0 z-20 bg-[var(--bar-bg)] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-dv-border">
          <div className="flex items-center justify-between px-8 h-12 max-w-[1100px] mx-auto">
            <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Settings</h1>
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-dv-text/40 hover:text-dv-text/70 transition-colors flex items-center gap-1.5"
            >
              Dashboard <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="relative z-[1] flex gap-8 px-8 py-8 max-w-[1100px] mx-auto">

          {/* ── Left nav ── */}
          <div className="w-56 flex-shrink-0">
            <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border overflow-hidden shadow-[var(--inset)]">
              {sections.map((section, i) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all active:scale-[0.98] ${
                      i < sections.length - 1 ? 'border-b border-[var(--glass-3)]' : ''
                    } ${
                      isActive
                        ? 'bg-[var(--glass-6)] text-dv-text'
                        : 'text-dv-text/35 hover:bg-[var(--glass-3)] hover:text-dv-text/60'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive ? 'bg-dv-accent/15' : 'bg-[var(--glass-4)]'
                    }`}>
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-dv-accent' : ''}`} />
                    </div>
                    <span className="text-[13px] font-medium">{section.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="settings-nav"
                        className="ml-auto w-1 h-3.5 rounded-full bg-dv-accent"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            <button className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-dv-error/70 hover:bg-dv-error/8 rounded-2xl transition-all active:scale-[0.98]">
              <div className="w-7 h-7 rounded-lg bg-dv-error/10 flex items-center justify-center">
                <LogOut className="w-3.5 h-3.5 text-dv-error" />
              </div>
              <span className="text-[13px] font-medium">Sign Out</span>
            </button>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 max-w-2xl">
            <AnimatePresence mode="wait">

              {/* ════════ ACCOUNT ════════ */}
              {activeSection === 'account' && (
                <motion.div
                  key="account"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="space-y-5"
                >
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-6">Profile</h2>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-dv-accent to-dv-indigo p-[2px]">
                        <div className="w-full h-full rounded-full bg-dv-surface flex items-center justify-center overflow-hidden">
                          {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-dv-accent" />
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold">{user?.username || 'User'}</p>
                        <p className="text-[13px] text-dv-text/30">{user?.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[12px] font-medium text-dv-text/30 mb-2">Username</label>
                        <input
                          type="text"
                          defaultValue={user?.username || ''}
                          className="w-full bg-[var(--glass-4)] border border-dv-border rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-dv-text/20 focus:outline-none focus:ring-1 focus:ring-dv-accent/25 focus:border-dv-accent/30 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[12px] font-medium text-dv-text/30 mb-2">Email</label>
                        <input
                          type="email"
                          defaultValue={user?.email || ''}
                          className="w-full bg-[var(--glass-4)] border border-dv-border rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-dv-text/20 focus:outline-none focus:ring-1 focus:ring-dv-accent/25 focus:border-dv-accent/30 transition-all"
                        />
                      </div>
                    </div>

                    <button className="mt-6 px-5 py-2 text-[13px] font-semibold bg-[var(--btn-solid-bg)] text-[var(--btn-solid-text)] rounded-full hover:bg-[var(--btn-solid-hover)] active:scale-[0.97] transition-all shadow-[var(--btn-solid-shadow)]">
                      Save Changes
                    </button>
                  </div>

                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-5">Connected Accounts</h2>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--glass-4)] border border-dv-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--glass-8)] flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-[14px] font-medium">GitHub</p>
                          <p className="text-[12px] text-dv-text/30">@{user?.username || 'user'}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-dv-success/12 text-dv-success text-[11px] font-semibold">
                        Connected
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ════════ APPEARANCE (Functional) ════════ */}
              {activeSection === 'appearance' && (
                <motion.div
                  key="appearance"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="space-y-5"
                >
                  {/* Theme */}
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-2">Theme</h2>
                    <p className="text-[13px] text-dv-text/25 mb-5">Choose how DocuVerse looks to you.</p>

                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { id: 'dark' as ThemeMode, label: 'Dark', icon: Moon, desc: 'Pure black' },
                        { id: 'light' as ThemeMode, label: 'Light', icon: Sun, desc: 'Bright mode' },
                        { id: 'system' as ThemeMode, label: 'System', icon: Monitor, desc: 'Match OS' },
                      ]).map((t) => {
                        const Icon = t.icon
                        const isSelected = theme === t.id
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`relative p-5 rounded-2xl border transition-all active:scale-[0.97] text-center ${
                              isSelected
                                ? 'border-dv-accent/40 bg-dv-accent/8 shadow-[0_0_20px_rgba(10,132,255,0.08)]'
                                : 'border-dv-border bg-[var(--glass-3)] hover:bg-[var(--glass-5)]'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="theme-check"
                                className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-dv-accent flex items-center justify-center"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                            <Icon className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-dv-accent' : 'text-dv-text/30'}`} />
                            <span className="text-[13px] font-semibold block">{t.label}</span>
                            <span className="text-[11px] text-dv-text/20">{t.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-2">Accent Color</h2>
                    <p className="text-[13px] text-dv-text/25 mb-5">Personalize the interface highlight color.</p>

                    <div className="flex items-center gap-3">
                      {accentOptions.map((opt) => {
                        const isSelected = accentColor === opt.color
                        return (
                          <button
                            key={opt.color}
                            onClick={() => setAccentColor(opt.color)}
                            title={opt.label}
                            className={`relative w-10 h-10 rounded-full transition-all active:scale-[0.9] ${
                              isSelected ? '' : 'hover:scale-110'
                            }`}
                            style={{
                              backgroundColor: opt.color,
                              boxShadow: isSelected ? `0 0 0 2px #000, 0 0 0 4px ${opt.color}, 0 0 16px ${opt.color}40` : undefined,
                            }}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute inset-0 flex items-center justify-center"
                              >
                                <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                              </motion.div>
                            )}
                          </button>
                        )
                      })}
                    </div>

                    {/* Preview */}
                    <div className="mt-5 p-4 rounded-xl border border-dv-border bg-[var(--glass-2)]">
                      <p className="text-[11px] font-semibold text-dv-text/20 uppercase tracking-[0.06em] mb-3">Preview</p>
                      <div className="flex items-center gap-3">
                        <div className="px-4 py-1.5 rounded-full text-[12px] font-semibold text-white" style={{ backgroundColor: accentColor }}>
                          Primary Button
                        </div>
                        <div className="px-4 py-1.5 rounded-full text-[12px] font-semibold border" style={{ borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}12` }}>
                          Secondary
                        </div>
                        <span className="text-[13px] font-medium" style={{ color: accentColor }}>Link text</span>
                      </div>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Type className="w-4 h-4 text-dv-text/40" />
                      <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Font Size</h2>
                    </div>
                    <p className="text-[13px] text-dv-text/25 mb-5">Adjust the interface text size.</p>

                    <div className="grid grid-cols-3 gap-3">
                      {fontSizeOptions.map((opt) => {
                        const isSelected = fontSize === opt.id
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setFontSize(opt.id)}
                            className={`relative p-4 rounded-xl border transition-all active:scale-[0.97] text-left ${
                              isSelected
                                ? 'border-dv-accent/40 bg-dv-accent/8'
                                : 'border-dv-border bg-[var(--glass-3)] hover:bg-[var(--glass-5)]'
                            }`}
                          >
                            {isSelected && (
                              <motion.div
                                layoutId="fontsize-check"
                                className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-dv-accent flex items-center justify-center"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              >
                                <Check className="w-2.5 h-2.5 text-white" />
                              </motion.div>
                            )}
                            <span className={`font-semibold block mb-0.5 ${
                              opt.id === 'small' ? 'text-[12px]' : opt.id === 'large' ? 'text-[16px]' : 'text-[14px]'
                            }`}>{opt.label}</span>
                            <span className="text-[11px] text-dv-text/20">{opt.desc}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Accessibility */}
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-4 h-4 text-dv-text/40" />
                      <h2 className="text-[18px] font-semibold tracking-[-0.02em]">Accessibility</h2>
                    </div>
                    <p className="text-[13px] text-dv-text/25 mb-5">Visual comfort options.</p>

                    <IOSToggle
                      label="Reduce motion"
                      description="Minimize animations throughout the interface"
                      checked={reducedMotion}
                      onChange={setReducedMotion}
                    />
                  </div>
                </motion.div>
              )}

              {/* ════════ BILLING ════════ */}
              {activeSection === 'billing' && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease }}
                  className="space-y-5"
                >
                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-5">Current Plan</h2>

                    <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-dv-accent/12 via-dv-purple/8 to-dv-indigo/12 border border-dv-accent/15">
                      <div className="absolute top-3 right-3">
                        <Sparkles className="w-5 h-5 text-dv-accent/30" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[20px] font-bold tracking-[-0.02em]">Free Plan</p>
                          <p className="text-[13px] text-dv-text/30 mt-1">5 walkthroughs per month</p>
                        </div>
                        <button className="px-5 py-2 text-[13px] font-semibold bg-[var(--btn-solid-bg)] text-[var(--btn-solid-text)] rounded-full hover:bg-[var(--btn-solid-hover)] active:scale-[0.97] transition-all shadow-[var(--btn-solid-shadow)]">
                          Upgrade to Pro
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[var(--glass-3)] backdrop-blur-2xl border border-dv-border p-6 shadow-[var(--inset)]">
                    <h2 className="text-[18px] font-semibold tracking-[-0.02em] mb-5">Usage</h2>

                    <div className="space-y-5">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-[14px] text-dv-text/40">Walkthroughs</span>
                          <span className="text-[12px] font-semibold">3 / 5</span>
                        </div>
                        <div className="h-2 bg-[var(--glass-6)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '60%' }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-dv-accent to-dv-purple rounded-full"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-[14px] text-dv-text/40">Audio minutes</span>
                          <span className="text-[12px] font-semibold">12 / 30</span>
                        </div>
                        <div className="h-2 bg-[var(--glass-6)] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '40%' }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-dv-success to-dv-cyan rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── iOS Toggle ── */
function IOSToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium">{label}</p>
        <p className="text-[12px] text-dv-text/25 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-[51px] h-[31px] rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-dv-success' : 'bg-[var(--glass-16)]'
        }`}
      >
        <motion.div
          className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          animate={{ left: checked ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </button>
    </div>
  )
}

