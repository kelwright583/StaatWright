import { redirect } from "next/navigation";
export default function VenturesRedirect() {
  redirect("/admin/partners?type=venture");
}
