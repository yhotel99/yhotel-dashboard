import { SettingsForm } from "@/components/settings-form";
import { getSettingsAction } from "@/actions/settings";

export default async function SettingsPage() {
  const settings = await getSettingsAction();

  return (
    <div className="flex flex-col gap-4 p-4 max-w-7xl w-full mx-auto">
      <SettingsForm initialData={settings} />
    </div>
  );
}
