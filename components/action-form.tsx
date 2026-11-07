"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionState = { error?: string; ok?: string } | undefined;
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** A form wired to a server action, showing a pending state and any error/success message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="mt-2 text-sm text-red-400" role="alert">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-emerald-400">{state.ok}</p>}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText = "Working…",
  className,
  variant,
  name,
  value,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      name={name}
      value={value}
      className={cn(!variant && "bg-brand text-white", className)}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
