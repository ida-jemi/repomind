import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("repomind_token");

  function logout() {
    localStorage.removeItem("repomind_token");
    navigate("/");
  }

  return (
    <header className="border-b border-site-line/70 bg-site-bg/90 backdrop-blur sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 rounded-sm bg-site-amber/90 grid place-items-center text-site-bg font-mono text-xs font-bold group-hover:bg-site-amber transition-colors">
            RM
          </span>
          <span className="font-display text-lg tracking-tight">RepoMind</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link to="/dashboard" className="text-site-muted hover:text-site-bone transition-colors">
            Dig sites
          </Link>
          <Link to="/new" className="text-site-muted hover:text-site-bone transition-colors">
            New excavation
          </Link>
          {token ? (
            <button onClick={logout} className="text-site-muted hover:text-site-rust transition-colors">
              Sign out
            </button>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 rounded border border-site-amber/50 text-site-amber hover:bg-site-amber/10 transition-colors"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
