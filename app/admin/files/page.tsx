import { createClient } from "@/lib/supabase/server";
import AdminTopBar from "@/components/admin/AdminTopBar";
import FileManager from "@/components/admin/FileManager";

export default async function FilesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <AdminTopBar
        title="Files"
        user={user ? { email: user.email ?? "" } : null}
      />
      <FileManager />
    </>
  );
}
