import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/admin/partners/${id}`);
}
