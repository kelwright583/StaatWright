import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AdminTopBar
        title="Settings"
        user={user ? { email: user.email ?? "" } : null}
      />
      <main className="pt-[56px] p-8">
        <SettingsForm />
      </main>
    </>
  );
}
