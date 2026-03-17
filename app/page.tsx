import { createClient } from "@/lib/supabase/server";
import PublicNav from "@/components/public/PublicNav";
import HeroSection from "@/components/public/HeroSection";
import ServicesSection from "@/components/public/ServicesSection";
import PartnersSection from "@/components/public/PartnersSection";
import ContactSection from "@/components/public/ContactSection";
import PublicFooter from "@/components/public/PublicFooter";
import ScrollReveal from "@/components/public/ScrollReveal";
import { CompanySettings, Brand } from "@/lib/types";

export const revalidate = 60;

export default async function Home() {
  const supabase = await createClient();

  const [{ data: settings }, { data: brands }] = await Promise.all([
    supabase.from("company_settings").select("*").single(),
    supabase
      .from("brands")
      .select("id, name, tagline, live_url, show_on_public_site, public_one_liner, public_logo_variant, public_sort_order, status, description, created_at, updated_at")
      .eq("show_on_public_site", true)
      .order("public_sort_order", { ascending: true }),
  ]);

  return (
    <>
      <ScrollReveal />
      <PublicNav />
      <HeroSection />
      <ServicesSection settings={settings as CompanySettings | null} />
      <PartnersSection brands={(brands as Brand[]) ?? []} />
      <ContactSection contactEmail={settings?.contact_email ?? null} />
      <PublicFooter />
    </>
  );
}
