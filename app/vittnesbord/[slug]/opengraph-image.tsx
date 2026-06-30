import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Vittnesbörd på testimony.se";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("testimonies")
    .select("title, lede, format, chain_size")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  const title = t?.title || "Vittnesbörd";
  const lede = t?.lede || "";
  const chainSize = t?.chain_size || 1;
  const formatLabel =
    t?.format === "musik" ? "Musikvittnesbörd"
    : t?.format === "video" ? "Videovittnesbörd"
    : t?.format === "bildberattelse" ? "Bildberättelse"
    : "Vittnesbörd";

  // Parchment palette: bg #f5f0e6, ink #1c1917, olive #5e6b3a
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "70px 80px",
          background: "linear-gradient(135deg, #f5f0e6 0%, #ede4d3 100%)",
          fontFamily: '"Georgia", serif',
          color: "#1c1917",
          position: "relative",
        }}
      >
        {/* subtle texture overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at top right, rgba(94,107,58,0.07), transparent 60%), radial-gradient(ellipse at bottom left, rgba(180,140,40,0.05), transparent 60%)",
            display: "flex",
          }}
        />

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#5e6b3a",
              fontWeight: 600,
            }}
          >
            {formatLabel}
          </div>
          {chainSize > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(94,107,58,0.12)",
                color: "#3d4625",
                padding: "10px 20px",
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              ⛓ {chainSize} i kedjan
            </div>
          )}
        </div>

        {/* title + lede */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1040 }}>
          <div
            style={{
              fontSize: title.length > 60 ? 64 : title.length > 35 ? 78 : 96,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#1c1917",
            }}
          >
            {title}
          </div>
          {lede && (
            <div
              style={{
                fontSize: 30,
                fontStyle: "italic",
                color: "#57534e",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {lede}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(28,25,23,0.15)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.01em" }}>
            testimony<span style={{ color: "#5e6b3a" }}>.se</span>
          </div>
          <div style={{ fontSize: 20, color: "#78716c", fontStyle: "italic" }}>
            Vad Gud gör i vanliga människors liv
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
