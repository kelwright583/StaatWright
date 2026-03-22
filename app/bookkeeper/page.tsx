"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfYearISO(): string {
  const y = new Date().getFullYear();
  return `${y}-01-01`;
}

function downloadFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function BookkeeperPage() {
  const [checked, setChecked] = useState(false);
  const [dateFrom, setDateFrom] = useState(firstOfYearISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [toast, setToast] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }: { data: { user: { id: string; email?: string } | null } }) => {
        if (!user) {
          window.location.href = "/bookkeeper/login";
        } else {
          setChecked(true);
        }
      });
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function handleDownload(report: string, filename: string) {
    setDownloading(report);
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(`/api/reports/${report}?${params}`);
      if (!res.ok) {
        const text = await res.text();
        showToast(`Error: ${text || res.statusText}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${filename}-${dateFrom}-${dateTo}.xlsx`);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setDownloading(null);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/bookkeeper/login";
  }

  if (!checked) return null;

  const inputCls =
    "border border-[#EAE4DC] bg-white px-3 py-2 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#5C6E81] transition-colors";

  const reports: { key: string; label: string; filename: string }[] = [
    { key: "pl", label: "P&L Statement (Excel)", filename: "staatwright-pl" },
    { key: "invoices", label: "Invoice Register (Excel)", filename: "staatwright-invoices" },
    { key: "expenses", label: "Expense Register (Excel)", filename: "staatwright-expenses" },
    { key: "drawings", label: "Drawings Log (Excel)", filename: "staatwright-drawings" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#FAFAF9" }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 bg-[#1F2A38] text-white text-sm px-5 py-3 shadow-lg z-50"
          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
        >
          {toast}
        </div>
      )}

      <div className="w-full max-w-[520px] space-y-6">
        {/* Wordmark */}
        <div className="text-center mb-2">
          <h1
            className="text-3xl font-bold text-[#1F2A38] tracking-tight"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            StaatWright
          </h1>
          <p
            className="text-xs uppercase tracking-widest text-[#5C6E81] mt-1"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Bookkeeper Portal
          </p>
        </div>

        {/* Period selector */}
        <div className="bg-white border border-[#EAE4DC] p-6" style={{ borderRadius: 0 }}>
          <p
            className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium mb-4"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Reporting Period
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Date From
              </label>
              <input
                type="date"
                className={inputCls}
                style={{ borderRadius: 0, width: "100%" }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label
                className="block text-xs text-[#5C6E81] uppercase tracking-wider mb-1"
                style={{ fontFamily: "var(--font-montserrat)" }}
              >
                Date To
              </label>
              <input
                type="date"
                className={inputCls}
                style={{ borderRadius: 0, width: "100%" }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

        <button
          type="button"
          className="mt-5 w-full px-4 py-2.5 bg-[#1F2A38] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
          disabled={downloading === "package"}
          onClick={() => handleDownload("package", "staatwright-package")}
        >
          {downloading === "package" ? "Generating…" : "Generate Package"}
        </button>
        </div>

        {/* Individual reports */}
        <div className="bg-white border border-[#EAE4DC] p-6" style={{ borderRadius: 0 }}>
          <p
            className="text-xs text-[#5C6E81] uppercase tracking-wider font-medium mb-4"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Individual Reports
          </p>
          <div className="space-y-2">
            {reports.map((r) => (
              <button
                key={r.key}
                type="button"
                disabled={downloading === r.key}
                onClick={() => handleDownload(r.key, r.filename)}
                className="w-full flex items-center justify-between px-4 py-3 border border-[#EAE4DC] text-sm text-[#1A1A1A] hover:border-[#5C6E81] hover:bg-[#F3F2EE] transition-colors disabled:opacity-50"
                style={{ borderRadius: 0, fontFamily: "var(--font-montserrat)" }}
              >
                <span>{r.label}</span>
                <span className="text-xs text-[#5C6E81]">
                  {downloading === r.key ? "Downloading…" : "Download"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-[#5C6E81] hover:text-[#1F2A38] transition-colors uppercase tracking-wider"
            style={{ fontFamily: "var(--font-montserrat)" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
