'use client';

import { useEffect, useRef } from 'react';

interface Props {
  err?: string;
  wait?: string;
  settings: {
    title: string;
    logo: string | null;
    loginWallpaper: string | null;
    allowRegistration: boolean;
  };
}

function getErrorText(err?: string, wait?: string) {
  if (!err) return null;
  if (err === 'invalid_credentials') return 'Incorrect username or password.';
  if (err === 'account_locked') {
    const mins = wait || 'a few';
    return `Account temporarily locked. Try again in ${mins} minute${wait === '1' ? '' : 's'}.`;
  }
  return 'Something went wrong. Try again.';
}

export default function LoginForm({ err, wait, settings }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pwInputRef = useRef<HTMLInputElement>(null);
  const cbInputRef = useRef<HTMLInputElement>(null);
  const cbBoxRef = useRef<HTMLSpanElement>(null);
  const cbCheckRef = useRef<SVGSVGElement>(null);

  const errorText = getErrorText(err, wait);
  const wallpaper = settings.loginWallpaper || 'https://i.imgur.com/j9BodUY.jpeg';

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panelRef.current?.classList.add('visible');
      });
    });
  }, []);

  function handleSubmit() {
    if (btnRef.current) {
      btnRef.current.classList.add('loading');
      btnRef.current.disabled = true;
    }
  }

  function togglePassword() {
    if (!pwInputRef.current) return;
    pwInputRef.current.type = pwInputRef.current.type === 'password' ? 'text' : 'password';
  }

  function toggleCheckbox(e: React.MouseEvent) {
    if ((e.target as HTMLElement) === cbInputRef.current) return;
    if (!cbInputRef.current || !cbBoxRef.current || !cbCheckRef.current) return;
    cbInputRef.current.checked = !cbInputRef.current.checked;
    const isDark = document.documentElement.classList.contains('dark');
    if (cbInputRef.current.checked) {
      cbBoxRef.current.style.background = isDark ? 'white' : '#171717';
      cbBoxRef.current.style.borderColor = isDark ? 'white' : '#171717';
      cbCheckRef.current.style.display = 'block';
    } else {
      cbBoxRef.current.style.background = '';
      cbBoxRef.current.style.borderColor = '';
      cbCheckRef.current.style.display = 'none';
    }
  }

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { display: none; }
        body, html { height: 100%; margin: 0; }
        .auth-split { display: flex; min-height: 100vh; }
        .auth-panel {
          width: 100%; max-width: 420px; flex-shrink: 0;
          display: flex; flex-direction: column; justify-content: center;
          padding: 48px 40px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-right: 1px solid rgba(0,0,0,0.08);
          position: relative; z-index: 1;
          opacity: 0; transform: translateX(-12px);
          transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1);
        }
        html.dark .auth-panel { background: rgba(20,20,20,0.08); border-right-color: rgba(255,255,255,0.08); }
        .auth-panel.visible { opacity: 1; transform: translateX(0); }
        .auth-image { flex: 1; background: url('${wallpaper}') center/cover no-repeat; }
        @media (max-width: 768px) {
          .auth-split { display: block; min-height: 100vh; }
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
        html.dark .auth-input:focus { border-color: rgba(255,255,255,0.08); box-shadow: 0 0 0 3px rgba(255,255,255,0.08); }
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
        .pw-toggle:hover { color: #737373; }
        .cb-row { display: flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
        .cb-box { width: 16px; height: 16px; border-radius: 4px; flex-shrink: 0; border: 1.5px solid #d4d4d4; background: white; display: flex; align-items: center; justify-content: center; transition: background 0.12s, border-color 0.12s; }
        html.dark .cb-box { background: #262626; border-color: #404040; }
        .cb-check { display: none; }
        .spinner { width: 15px; height: 15px; flex-shrink: 0; border: 2px solid rgba(255,255,255,0.08); border-top-color: white; border-radius: 50%; animation: spin 0.65s linear infinite; display: none; }
        html.dark .spinner { border-color: rgba(0,0,0,0.25); border-top-color: #0a0a0a; }
        .auth-submit.loading .spinner { display: block; }
        .auth-submit.loading .btn-label { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="auth-split">
        <div className="auth-panel" ref={panelRef} id="authPanel">
          <div style={{ marginBottom: 32 }}>
            {settings.logo && (
              <img src={settings.logo} alt="" className="h-10 w-10 rounded-xl object-contain mb-5" />
            )}
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Sign in</h1>
            <p className="text-sm text-neutral-500 mt-1">to {settings.title}</p>
          </div>

          {errorText && (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 mb-5">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorText}</p>
            </div>
          )}

          <form ref={formRef} id="loginForm" method="POST" action="/api/auth/login" autoComplete="on" noValidate onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="auth-label" htmlFor="identifier">Username or email</label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  spellCheck={false}
                  autoCapitalize="none"
                  className="auth-input"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="auth-label" htmlFor="password">Password</label>
                <div className="pw-wrapper">
                  <input
                    ref={pwInputRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="auth-input"
                    placeholder="••••••••"
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" className="pw-toggle" onClick={togglePassword} aria-label="Show password">
                    <svg id="eyeIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              <label className="cb-row" onClick={toggleCheckbox}>
                <input ref={cbInputRef} id="remember" name="remember-me" type="checkbox" className="sr-only" />
                <span ref={cbBoxRef} className="cb-box">
                  <svg ref={cbCheckRef} className="cb-check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" fill="none" width="10" height="10">
                    <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Remember me</span>
              </label>

              <button ref={btnRef} type="submit" className="auth-submit" id="submitBtn">
                <span className="btn-label">Sign in</span>
                <span className="spinner" />
              </button>
            </div>
          </form>

          {settings.allowRegistration && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center mt-6">
              Don&apos;t have an account?{' '}
              <a href="/register" className="font-medium text-neutral-800 dark:text-neutral-200 hover:underline">
                Create one
              </a>
            </p>
          )}
        </div>
        <div className="auth-image" />
      </div>
    </>
  );
}
