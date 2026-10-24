import { SettingsForm } from "@/components/admin-forms";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/server/auth/session";
import { getSettings, SETTING_LABELS } from "@/server/services/settings";

export default async function AdminSettings() {
  await requireUser(["admin"]);
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações comerciais" subtitle="Valores iniciais são hipóteses (docs/BUSINESS.md). Alterações ficam na auditoria." />
      <Card><SettingsForm values={settings} labels={SETTING_LABELS} /></Card>
    </div>
  );
}
