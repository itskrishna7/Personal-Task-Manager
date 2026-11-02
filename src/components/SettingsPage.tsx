import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Menu, Settings, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { WorkspacePage } from "../data/navigation";
import { getSupabaseClient, isSupabaseConfigured } from "../services/supabase";
import { DashboardSidebar } from "./DashboardSidebar";

type SettingsPageProps = {
  onNavigate: (page: WorkspacePage) => void;
  onOpenWelcome: () => void;
};

export function SettingsPage({ onNavigate, onOpenWelcome }: SettingsPageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const client = getSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setErrorMessage(error.message);
      } else {
        setUser(data.session?.user ?? null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submitAccountForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const client = getSupabaseClient();
      if (isCreatingAccount) {
        const credentials = { email: email.trim(), password };
        if (user?.is_anonymous) {
          const { data, error } = await client.auth.updateUser({
            ...credentials,
            data: displayName.trim() ? { display_name: displayName.trim() } : {},
          });
          if (error) throw error;
          setUser(data.user);
          setStatusMessage("Your private workspace is now connected to this account. Check your email if confirmation is requested.");
        } else {
          const { data, error } = await client.auth.signUp({
            ...credentials,
            options: { data: displayName.trim() ? { display_name: displayName.trim() } : {} },
          });
          if (error) throw error;
          setUser(data.user);
          setStatusMessage(data.session
            ? "Your account has been created."
            : "Account created. Check your email to confirm your address before signing in.");
        }
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setUser(data.user);
        setStatusMessage("You are signed in.");
      }
      setPassword("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The account request could not be completed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);
    try {
      const { error } = await getSupabaseClient().auth.signOut();
      if (error) throw error;
      setUser(null);
      setStatusMessage("You have signed out.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "You could not be signed out.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isAnonymous = user?.is_anonymous === true;

  return (
    <div className="dashboard-shell">
      <DashboardSidebar
        activePage="settings"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={onNavigate}
        onOpenWelcome={onOpenWelcome}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="topbar-leading">
            <button aria-label="Open navigation" className="mobile-menu-button" onClick={() => setMobileOpen(true)} type="button">
              <Menu size={18} />
            </button>
            <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>Settings</strong></div>
          </div>
        </header>
        <div className="settings-page-content">
          <section className="settings-page-heading">
            <div className="dashboard-eyebrow"><span className="eyebrow-line" /> MAKE MINDSPACE YOURS</div>
            <h1>Settings</h1>
            <p>Manage your profile and how you access your private workspace.</p>
          </section>

          <section aria-labelledby="account-settings-heading" className="settings-panel">
            <header className="settings-panel-heading">
              <span className="settings-panel-icon"><UserRound size={17} /></span>
              <div><h2 id="account-settings-heading">Profile & account</h2><p>Create an account or sign in to access your private workspace.</p></div>
            </header>

            {isLoading ? (
              <p className="settings-muted" role="status">Checking your account…</p>
            ) : user && !isAnonymous ? (
              <div className="settings-account-summary">
                <div className="settings-account-avatar">{(user.email?.[0] ?? "U").toUpperCase()}</div>
                <div><strong>{user.user_metadata.display_name || user.email || "Your account"}</strong><p>{user.email}</p></div>
                <button className="settings-secondary-button" disabled={isSubmitting} onClick={() => void signOut()} type="button">{isSubmitting ? "Signing out…" : "Sign out"}</button>
              </div>
            ) : (
              <>
                {!isSupabaseConfigured && (
                  <div className="settings-notice" role="status">
                    <KeyRound size={17} />
                    <div><strong>Account access needs Supabase</strong><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your local <code>.env</code> file, then restart the app. See the Supabase setup instructions in the README.</p></div>
                  </div>
                )}
                {isAnonymous && <p className="settings-account-note">You are using a private workspace on this device. Creating an account here keeps this workspace’s saved data with you.</p>}
                <div aria-label="Account action" className="settings-auth-tabs" role="group">
                  <button aria-pressed={isCreatingAccount} className={isCreatingAccount ? "is-selected" : ""} onClick={() => { setIsCreatingAccount(true); setErrorMessage(null); setStatusMessage(null); }} type="button">Create account</button>
                  <button aria-pressed={!isCreatingAccount} className={!isCreatingAccount ? "is-selected" : ""} onClick={() => { setIsCreatingAccount(false); setErrorMessage(null); setStatusMessage(null); }} type="button">Sign in</button>
                </div>
                {isSupabaseConfigured && (
                  <form className="settings-auth-form" onSubmit={(event) => void submitAccountForm(event)}>
                    {isCreatingAccount && <label>Your name <span>(optional)</span><input autoComplete="name" maxLength={80} onChange={(event) => setDisplayName(event.target.value)} value={displayName} /></label>}
                    <label>Email address<input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
                    <label>Password<input autoComplete={isCreatingAccount ? "new-password" : "current-password"} minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
                    {errorMessage && <p className="settings-form-error" role="alert">{errorMessage}</p>}
                    {statusMessage && <p className="settings-form-success" role="status">{statusMessage}</p>}
                    <button className="settings-primary-button" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Please wait…" : isCreatingAccount ? "Create account" : "Sign in"}
                    </button>
                  </form>
                )}
              </>
            )}
            {errorMessage && (!isSupabaseConfigured || isLoading || (user && !isAnonymous)) && <p className="settings-form-error" role="alert">{errorMessage}</p>}
            {statusMessage && user && !isAnonymous && <p className="settings-form-success" role="status">{statusMessage}</p>}
          </section>

          <section className="settings-panel settings-workspace-panel">
            <header className="settings-panel-heading">
              <span className="settings-panel-icon"><Settings size={17} /></span>
              <div><h2>Private workspace</h2><p>Your tasks stay in this browser. Supabase-backed notes, habits, goals and reviews are stored in your connected account.</p></div>
            </header>
            <p className="settings-muted">Signing in on another device does not automatically sync tasks stored only in this browser.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
