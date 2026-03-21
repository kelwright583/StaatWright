import { redirect } from "next/navigation";

export default function ClientNewRedirect() {
  redirect("/admin/partners/new?type=client");
}
