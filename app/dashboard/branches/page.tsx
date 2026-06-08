import { listBranches } from "@/services/branches";
import { BranchesContent } from "@/components/branches/branches-content";

export default async function BranchesPage() {
  let branches: Awaited<ReturnType<typeof listBranches>> = [];
  try {
    branches = await listBranches();
  } catch {
    branches = [];
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <BranchesContent initialBranches={branches} />
    </div>
  );
}
