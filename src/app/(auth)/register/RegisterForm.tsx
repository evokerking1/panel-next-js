'use client';

import { useEffect, useRef } from 'react';

interface Props {
  err?: string;
  isFirst: boolean;
  settings: {
    title: string;
    logo: string | null;
    registerWallpaper: string | null;
  };
}

function getErrorText(err?: string) {
  if (!err) return null;
  if (err === 'missing_credentials') return 'All fields are required.';
  if (err === 'invalid_username') return 'Username must be 3–20 characters, letters and numbers only.';
  if (err === 'user_already_exists') return 'That username or email is already taken.';
  if (err === 'invalid_input') return 'Password needs 8+ characters, at least one letter and one number.';
  return 'Something went wrong. Try again.';
}

export default function RegisterForm({ err, isFirst, settings }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);

  const wallpaper = settings.registerWallpaper || 'https://i.imgur.com/8G5eRWX.jpeg';
  const errorText = getErrorText(err);

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      panelRef.current?.classList.add('visible');
    }));
  }, []);

  function handlePasswordInput() {
    const pw = pwRef.current?.value || '';
    const bar = barRef.current;
    const hint = hintRef.current;
    if (!bar || !hint) return;

    let strength = 0;
    if (pw.length >= 8) strength++;
    if (/[A-Za-z]/.test(pw)) strength++;
    if (/\d/.test(pw)) strength++;
    if (/[^A-Za-z0-9]/.test(pw)) strength++;

    const widths = ['0%', '25%', '50%', '75%', '100%'];
    const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];
    const hints = ['', 'Too short', 'Weak', 'Almost there', 'Strong'];

    bar.style.width = widths[strength];
    bar.style.background = colors[strength];
    hint.textContent = strength === 0 ? '8+ characters, one letter, one number.' : hints[strength];
    hint.style.color = strength === 0 ? '#a3a3a3' : colors[strength];
  }

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        body, html { height: 100%; margin: 0; }
        .auth-split { display: flex; min-height: 100vh; }
        .auth-panel {
          width: 100%; max-width: 460px; flex-shrink: 0;
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 40px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px) saturate(180%);
          border-right: 1px solid rgba(0,0,0,0.08);
          opacity: 0; transform: translateX(-12px);
          transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        html.dark .auth-panel { background: rgba(20,20,20,0.08); border-right-color: rgba(255,255,255,0.08); }
        .auth-panel.visible { opacity: 1; transform: translateX(0); }
        .auth-image { flex: 1; background: url('${wallpaper}') center/cover no-repeat; }
        @media (max-width: 768px) {
          .auth-split { display: block; }
          .auth-panel { max-width: 100%; border-right: none; padding: 40px 24px; min-height: 100vh; justify-content: center; }
          .auth-image { display: none; }
        }
        .auth-input {
          width: 100%; padding: 10px 14px; border-radius: 10px;
          border: 1px solid #e5e5e5; background: #f9fafb;
          font-size: 14px; color: #171717; outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box; font-family: inherit;
        }
        html.dark .auth-input { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.08); color: #e5e5e5; }
        .auth-input:focus { border-color: #a3a3a3; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        .auth-input::placeholder { color: #a3a3a3; }
        html.dark .auth-input::placeholder { color: #525252; }
        .auth-label { display: block; font-size: 13px; font-weight: 500; color: #525252; margin-bottom: 6px; }
        html.dark .auth-label { color: #a3a3a3; }
        .auth-submit {
          width: 100%; padding: 11px; border-radius: 10px;
          background: #171717; color: white; font-size: 14px; font-weight: 500;
          border: none; cursor: pointer; transition: background 0.15s;
          font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        html.dark .auth-submit { background: white; color: #0a0a0a; }
        .auth-submit:hover:not(:disabled) { background: #404040; }
        html.dark .auth-submit:hover:not(:disabled) { background: #e5e5e5; }
        .auth-submit:disabled { opacity: 0.6; cursor: default; }
        .pw-wrapper { position: relative; }
        .pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 0; color: #a3a3a3; line-height: 0; }
        .spinner { width: 15px; height: 15px; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.08); border-top-color: white; border-radius: 50%; animation: spin 0.65s linear infinite; display: none; }
        html.dark .spinner { border-color: rgba(0,0,0,0.25); border-top-color: #0a0a0a; }
        .auth-submit.loading .spinner { display: block; }
        .auth-submit.loading .btn-label { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-split">
        <div className="auth-panel" ref={panelRef}>
          <div style={{ marginBottom: 32 }}>
            {settings.logo && (
              <img src={settings.logo} alt="" className="h-10 w-10 rounded-xl object-contain mb-5" />
            )}
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              {isFirst ? 'Create admin account' : 'Create account'}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">{settings.title}</p>
          </div>

          {errorText && (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 mb-5">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorText}</p>
            </div>
          )}

          {isFirst && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-3 mb-5">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                This is the first account — it will have admin access.
              </p>
            </div>
          )}

          <form
            method="POST"
            action="/api/auth/register"
            autoComplete="on"
            noValidate
            onSubmit={() => {
              if (btnRef.current) {
                btnRef.current.classList.add('loading');
                btnRef.current.disabled = true;
              }
            }}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="auth-label" htmlFor="username">Username</label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    spellCheck={false}
                    autoCapitalize="none"
                    maxLength={20}
                    className="auth-input"
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <label className="auth-label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="auth-input"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="auth-label" htmlFor="password">Password</label>
                <div className="pw-wrapper">
                  <input
                    ref={pwRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="auth-input"
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                    onInput={handlePasswordInput}
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => {
                      if (pwRef.current) {
                        pwRef.current.type = pwRef.current.type === 'password' ? 'text' : 'password';
                      }
                    }}
                    aria-label="Show password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
                <div style={{ height: 3, borderRadius: 2, background: '#e5e5e5', marginTop: 8, overflow: 'hidden' }}>
                  <div ref={barRef} style={{ height: '100%', borderRadius: 2, width: '0%', transition: 'width 0.28s ease, background 0.28s ease' }} />
                </div>
                <p ref={hintRef} style={{ fontSize: 11, color: '#a3a3a3', marginTop: 5, minHeight: 14 }}>
                  8+ characters, one letter, one number.
                </p>
              </div>

              <button ref={btnRef} type="submit" className="auth-submit">
                <span className="btn-label">Create account</span>
                <span className="spinner" />
              </button>
            </div>
          </form>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-6">
            Already have an account?{' '}
            <a href="/login" className="font-medium text-neutral-800 dark:text-neutral-200 hover:underline">
              Sign in
            </a>
          </p>
        </div>
        <div className="auth-image" />
      </div>
    </>
  );
}
