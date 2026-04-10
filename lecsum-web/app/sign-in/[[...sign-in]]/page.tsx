import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1512" }}>
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: "absolute", width: 480, height: 480, top: -120, left: -80, borderRadius: "50%", filter: "blur(90px)", opacity: 0.6, background: "radial-gradient(circle,#0d3d26 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", width: 560, height: 560, top: 80, right: -160, borderRadius: "50%", filter: "blur(90px)", opacity: 0.6, background: "radial-gradient(circle,#0a2a3a 0%,transparent 70%)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Wordmark */}
        <div className="text-center mb-2">
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: 28, color: "#4ade80", letterSpacing: -1 }}>Lecsum</div>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Study Materials</div>
        </div>

        <SignIn
          appearance={{
            variables: {
              colorPrimary: "#4ade80",
              colorBackground: "rgba(14,22,18,0.95)",
              colorInputBackground: "rgba(255,255,255,0.05)",
              colorInputText: "#e8ede9",
              colorText: "#e8ede9",
              colorTextSecondary: "rgba(255,255,255,0.5)",
              colorNeutral: "rgba(255,255,255,0.1)",
              borderRadius: "0.75rem",
              fontFamily: "DM Sans, sans-serif",
            },
            elements: {
              card: {
                background: "rgba(14,22,18,0.92)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              },
              headerTitle: {
                color: "#e8ede9",
                fontFamily: "'DM Serif Display',serif",
              },
              headerSubtitle: {
                color: "rgba(255,255,255,0.4)",
              },
              socialButtonsBlockButton: {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e8ede9",
              },
              dividerLine: { background: "rgba(255,255,255,0.08)" },
              dividerText: { color: "rgba(255,255,255,0.3)" },
              formFieldLabel: { color: "rgba(255,255,255,0.6)" },
              formFieldInput: {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#e8ede9",
              },
              formButtonPrimary: {
                background: "#4ade80",
                color: "#0d1512",
                fontWeight: 600,
              },
              footerActionLink: { color: "#4ade80" },
              identityPreviewText: { color: "#e8ede9" },
              identityPreviewEditButton: { color: "#4ade80" },
              footer: { display: "none" }, // hides "Secured by Clerk"
            },
          }}
        />
        <p style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.4)" }}>
          Don't have an account?{" "}
          <a href="/sign-up" style={{ color: "#4ade80", fontWeight: 500, textDecoration: "none" }}>
            Sign up
          </a>
        </p>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&display=swap');`}</style>
    </div>
  );
}