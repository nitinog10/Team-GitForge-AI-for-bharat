'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/**
 * Extension Auth Bridge Page
 * 
 * This page is used by the DocuVerse VS Code extension to authenticate.
 * Flow: Extension opens this page → user logs in via normal GitHub OAuth →
 * this page displays the JWT token → user copies it into VS Code.
 * 
 * Design matches the main auth/signin page: centered card, radial glow,
 * gradient heading, white "Continue with GitHub" button.
 */
export default function ExtensionAuthPage() {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user already has a token in localStorage
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      setToken(existingToken);
      setIsLoggedIn(true);
    }

    // Listen for storage changes (token set after OAuth callback)
    const handleStorage = () => {
      const t = localStorage.getItem('token');
      if (t) {
        setToken(t);
        setIsLoggedIn(true);
      }
    };

    window.addEventListener('storage', handleStorage);

    // Also poll for token (in case storage event doesn't fire in same tab)
    const interval = setInterval(() => {
      const t = localStorage.getItem('token');
      if (t && !token) {
        setToken(t);
        setIsLoggedIn(true);
      }
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [token]);

  const handleCopy = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleLogin = () => {
    window.location.href = '/auth';
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#050505',
        fontFamily: "'Inter', 'DM Sans', -apple-system, system-ui, sans-serif",
        padding: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial blue glow background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(56, 100, 220, 0.12) 0%, rgba(56, 100, 220, 0.04) 40%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      {/* Subtle top/bottom edge glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background:
            'linear-gradient(90deg, transparent, rgba(80, 120, 255, 0.25), transparent)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '440px',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4F6EF7, #6366F1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '28px',
            boxShadow: '0 8px 32px rgba(79, 110, 247, 0.3), 0 0 48px rgba(79, 110, 247, 0.1)',
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#ffffff',
            margin: '0 0 12px 0',
            textAlign: 'center',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {isLoggedIn ? (
            <>
              Connected to{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #6B8AFF, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DocuVerse
              </span>
            </>
          ) : (
            <>
              Sign in to{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #6B8AFF, #A78BFA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                DocuVerse
              </span>
            </>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          style={{
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.4)',
            margin: '0 0 40px 0',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {isLoggedIn
            ? 'Copy the token below and paste it into VS Code.'
            : 'AI-powered code walkthroughs, narrated for you.'}
        </motion.p>

        {!isLoggedIn ? (
          /* ── Not logged in: show GitHub sign-in card ── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '20px',
              padding: '28px 24px',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.015, boxShadow: '0 4px 24px rgba(255,255,255,0.08)' }}
              whileTap={{ scale: 0.985 }}
              onClick={handleLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '16px 24px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'box-shadow 0.2s',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </motion.button>
          </motion.div>
        ) : (
          /* ── Logged in: show token ── */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            style={{ width: '100%' }}
          >
            {/* Success badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '24px',
                padding: '10px 16px',
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '12px',
              }}
            >
              <span style={{ fontSize: '14px' }}>✓</span>
              <span
                style={{
                  fontSize: '14px',
                  color: 'rgba(52, 211, 153, 0.9)',
                  fontWeight: 500,
                }}
              >
                Authenticated successfully
              </span>
            </div>

            {/* Token display */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <label
                style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontWeight: 600,
                  display: 'block',
                  marginBottom: '10px',
                }}
              >
                Your Auth Token
              </label>
              <div
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '10px',
                  padding: '14px',
                }}
              >
                <code
                  style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.55)',
                    wordBreak: 'break-all',
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    display: 'block',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    lineHeight: 1.6,
                  }}
                >
                  {token
                    ? `${token.substring(0, 20)}${'•'.repeat(30)}${token.substring(
                        token.length - 10
                      )}`
                    : ''}
                </code>
              </div>
            </div>

            {/* Copy button */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              onClick={handleCopy}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                width: '100%',
                padding: '16px 24px',
                background: copied
                  ? 'rgba(52, 211, 153, 0.15)'
                  : '#ffffff',
                color: copied ? 'rgba(52, 211, 153, 0.95)' : '#000000',
                border: copied
                  ? '1px solid rgba(52, 211, 153, 0.3)'
                  : '1px solid transparent',
                borderRadius: '14px',
                fontSize: '16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.3s ease',
              }}
            >
              {copied ? '✓ Copied! Paste in VS Code' : 'Copy Token to Clipboard'}
            </motion.button>

            {/* Instruction */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 18px',
                background: 'rgba(107, 138, 255, 0.06)',
                border: '1px solid rgba(107, 138, 255, 0.12)',
                borderRadius: '14px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  margin: 0,
                  lineHeight: 1.65,
                  textAlign: 'center',
                }}
              >
                <span style={{ color: 'rgba(107, 138, 255, 0.85)', fontWeight: 600 }}>
                  Next step:
                </span>{' '}
                Go back to VS Code and paste this token into the input box.
              </p>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          style={{
            marginTop: '36px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
          }}
        >
          By continuing you agree to our{' '}
          <span style={{ color: 'rgba(167, 139, 250, 0.6)' }}>Terms</span> &{' '}
          <span style={{ color: 'rgba(167, 139, 250, 0.6)' }}>Privacy</span>
        </motion.p>
      </motion.div>
    </div>
  );
}
