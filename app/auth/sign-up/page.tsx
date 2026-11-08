import { SignUpForm } from "@/components/sign-up-form";
import { paymentsEnabled } from "@/lib/flags";

export default function Page() {
  return (
    <div className="flex w-full items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm">
        <SignUpForm askAgeBand={paymentsEnabled()} />
      </div>
    </div>
  );
}
