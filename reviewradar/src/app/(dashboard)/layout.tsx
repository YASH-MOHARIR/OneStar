import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-slate-100">
      <nav className="flex items-center justify-between border-b border-white/60 bg-white/60 backdrop-blur-md px-6 py-4 shadow-sm">
        <a href="/" className="text-lg font-semibold text-blue-600">
          ReviewRadar
        </a>
        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                Sign in
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
    </div>
  );
}
