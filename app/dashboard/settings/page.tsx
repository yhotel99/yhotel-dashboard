import { SettingsForm } from "@/components/settings-form";
import { getSettingsAction } from "@/actions/settings";

export default async function SettingsPage() {
  const settings = await getSettingsAction();

  console.log(settings);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cài đặt Website</h1>
        <p className="text-muted-foreground">
          Quản lý thông tin website, liên hệ và mạng xã hội
        </p>
      </div>
      <SettingsForm initialData={settings} />
    </div>
  );
}
