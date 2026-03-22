"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { createClient } from "@/lib/supabase/client";
import AdminTopBar from "@/components/admin/AdminTopBar";
import {
  BrandIdentityForm,
  BrandColoursEditor,
  BrandTypographyEditor,
  BrandLogosEditor,
  BrandCardFields,
} from "@/components/admin/BrandEditor";
import type { Brand, BrandColour } from "@/lib/types";

const tabTriggerClass =
  "px-5 py-3 text-sm font-medium border-b-2 transition-colors data-[state=active]:border-navy data-[state=active]:text-navy data-[state=inactive]:border-transparent data-[state=inactive]:text-steel hover:text-navy";

export default function BrandWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const supabase = createClient();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandColours, setBrandColours] = useState<BrandColour[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data, error }, { data: colours }] = await Promise.all([
        supabase.from("brands").select("*").eq("id", id).single(),
        supabase.from("brand_colours").select("*").eq("brand_id", id),
      ]);

      if (error || !data) {
        setNotFound(true);
      } else {
        setBrand(data as Brand);
        setBrandColours((colours as BrandColour[]) ?? []);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <>
        <AdminTopBar title="Brand" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>Loading…</p>
        </main>
      </>
    );
  }

  if (notFound || !brand) {
    return (
      <>
        <AdminTopBar title="Brand not found" user={null} />
        <main className="pt-[56px] p-8">
          <p className="text-steel text-sm" style={{ fontFamily: "var(--font-montserrat)" }}>
            Brand not found.{" "}
            <button
              type="button"
              onClick={() => router.push("/admin/brands")}
              className="underline hover:text-navy"
            >
              Back to brands
            </button>
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminTopBar title={brand.name} user={null} />

      <main className="pt-[56px] p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/admin/brands")}
            className="text-steel text-sm hover:text-navy transition-colors"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            ← Brands
          </button>
          <span className="text-linen select-none">/</span>
          <span
            className="text-ink text-sm"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            {brand.name}
          </span>
        </div>

        <Tabs.Root defaultValue="identity" className="w-full">
          <div className="border-b border-linen mb-8">
            <Tabs.List className="flex gap-0 -mb-px" aria-label="Brand sections">
              {[
                { value: "identity", label: "Identity" },
                { value: "card", label: "Card Appearance" },
                { value: "colours", label: "Colours" },
                { value: "typography", label: "Typography" },
                { value: "logos", label: "Logos" },
              ].map((tab) => (
                <Tabs.Trigger
                  key={tab.value}
                  value={tab.value}
                  className={tabTriggerClass}
                  style={{ fontFamily: "var(--font-montserrat)" }}
                >
                  {tab.label}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </div>

          <Tabs.Content value="identity">
            <BrandIdentityForm
              brand={brand}
              onSaved={setBrand}
              hasPrimaryColour={brandColours.some((c) => c.role === "primary")}
            />
          </Tabs.Content>

          <Tabs.Content value="card">
            <BrandCardFields brand={brand} onSaved={setBrand} />
          </Tabs.Content>

          <Tabs.Content value="colours">
            <BrandColoursEditor brandId={brand.id} />
          </Tabs.Content>

          <Tabs.Content value="typography">
            <BrandTypographyEditor brandId={brand.id} />
          </Tabs.Content>

          <Tabs.Content value="logos">
            <BrandLogosEditor brandId={brand.id} />
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </>
  );
}
