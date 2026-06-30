import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Verksamhet på testimony.se";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, description, type, city")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  const name = org?.name || "Verksamhet";
  const description = org?.description || "";
  const meta = [org?.city, org?.type].filter(Boolean).join(" · ");

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
        }}
      >
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "#5e6b3a",
            fontWeight: 600,
          }}
        >
          Verksamhet {meta ? `· ${meta}` : ""}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1040 }}>
          <div
            style={{
              fontSize: name.length > 30 ? 80 : 104,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {name}
          </div>
          {description && (
            <div
              style={{
                fontSize: 32,
                color: "#57534e",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid rgba(28,25,23,0.15)",
            paddingTop: 28,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            testimony<span style={{ color: "#5e6b3a" }}>.se</span>
          </div>
          <div style={{ fontSize: 20, color: "#78716c", fontStyle: "italic" }}>
            Katalog över levande kristen verksamhet
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
