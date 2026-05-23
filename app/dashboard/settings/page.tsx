import { SettingsForm } from "@/components/settings-form";
import { getSettingsAction } from "@/actions/settings";

export default async function SettingsPage() {
  const settings = await getSettingsAction();

  return (
    <div className="flex flex-col gap-4 p-4 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Cài đặt</h1>
        <p className="text-muted-foreground text-sm">
          Cài đặt chung toàn hệ thống (không theo chi nhánh)
        </p>
      </div>
      <SettingsForm initialData={settings} />
    </div>
  );
}
