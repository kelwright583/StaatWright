"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        backgroundColor: "#1F2A38",
        color: "#fff",
        border: "none",
        padding: "10px 20px",
        fontSize: 14,
        fontFamily: "sans-serif",
        cursor: "pointer",
      }}
    >
      Print / Save as PDF
    </button>
  );
}
