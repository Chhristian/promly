import { PromlyLogo } from "@/components/promly-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl px-4 py-5">
        <PromlyLogo />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center pb-16">
        {children}
        <p className="mt-2 px-4 text-center text-sm text-muted-foreground">
          Refer a sale. Get paid, only when the customer actually shows up.
        </p>
      </div>
    </div>
  );
}
