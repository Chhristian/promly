import { requireRole } from "@/lib/auth";
import { DemoControl } from "./demo-control";

export default async function DemoControlPage() {
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Demo Control Center</h1>
        <p className="text-sm text-muted-foreground">
          Admin only. Before going on stage: <strong>Prepare Stage Demo</strong>, then <strong>Run Demo Health Check</strong> and
          make sure everything is green. See STAGE_DEMO.md.
        </p>
      </div>
      <DemoControl />
    </div>
  );
}
