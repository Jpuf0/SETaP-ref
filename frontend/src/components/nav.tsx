import { Link, useNavigate } from "@tanstack/react-router";
import { ModeToggle } from "#/components/mode-toggle";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";

export function Nav() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  async function handleLogout() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  return (
    <nav className="flex items-center justify-between border-b px-6 py-3 bg-accent">
      <div className="flex items-center gap-4">
        <Link to="/" className="font-bold">
          SETaP Projects
        </Link>
        <Link
          to="/staff"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Browse Staff
        </Link>
        {session?.user.role === "staff" && (
          <>
            <Link
              to="/profile/interests"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              My Interests
            </Link>
            <Link
              to="/profile/project-ideas"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              My Project Ideas
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-3">
        {isPending ? null : session?.user ? (
          <>
            <span>
              {session.user.name} ({session.user.role})
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" asChild>
              <Link
                to="/login"
                className="text-sm text-foreground hover:underline"
              >
                Sign in
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                to="/register"
                className="text-sm text-foreground hover:underline"
              >
                Register
              </Link>
            </Button>
          </>
        )}
        <ModeToggle />
      </div>
    </nav>
  );
}
