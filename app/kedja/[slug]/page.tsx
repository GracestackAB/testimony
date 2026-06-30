import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("testimonies").select("title").eq("slug", slug).eq("status", "published").maybeSingle();
  return { title: data ? `Kedja: ${data.title}` : "Vittnesbördskedja" };
}

type Node = {
  id: string;
  slug: string;
  title: string;
  lede: string | null;
  published_at: string | null;
  children?: Node[];
};

async function buildChainDown(supabase: any, rootId: string, depth = 0, maxDepth = 5): Promise<Node | null> {
  if (depth > maxDepth) return null;
  const { data } = await supabase
    .from("testimonies")
    .select("id, slug, title, lede, published_at")
    .eq("id", rootId)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;

  const { data: kids } = await supabase
    .from("testimonies")
    .select("id")
    .eq("inspired_by_testimony_id", rootId)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const children: Node[] = [];
  for (const k of kids || []) {
    const c = await buildChainDown(supabase, k.id, depth + 1, maxDepth);
    if (c) children.push(c);
  }
  return { ...data, children };
}

async function findRoot(supabase: any, startId: string): Promise<string> {
  let cur = startId;
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase
      .from("testimonies")
      .select("inspired_by_testimony_id")
      .eq("id", cur)
      .maybeSingle();
    if (!data?.inspired_by_testimony_id) return cur;
    cur = data.inspired_by_testimony_id;
  }
  return cur;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: start } = await supabase
    .from("testimonies")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!start) notFound();

  const rootId = await findRoot(supabase, start.id);
  const tree = await buildChainDown(supabase, rootId);
  if (!tree) notFound();

  const totalCount = countNodes(tree);

  return (
    <div className="max-w-4xl mx-auto px-5 py-14">
      <div className="text-xs text-stone-500 uppercase tracking-widest mb-3">Vittnesbördskedja</div>
      <h1 className="font-serif text-4xl font-semibold text-stone-900 mb-2">
        Så här har tron spridit sig
      </h1>
      <p className="text-stone-600 mb-10">
        En kedja av {totalCount} vittnesbörd, sprungna ur ett originalvittnesbörd.
      </p>

      <TreeNode node={tree} currentSlug={slug} depth={0} />
    </div>
  );
}

function countNodes(n: Node): number {
  return 1 + (n.children || []).reduce((sum, c) => sum + countNodes(c), 0);
}

function TreeNode({ node, currentSlug, depth }: { node: Node; currentSlug: string; depth: number }) {
  const isCurrent = node.slug === currentSlug;
  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-olive-200 pl-6 mt-5" : ""}>
      <Link
        href={`/vittnesbord/${node.slug}`}
        className={`block rounded-lg p-4 transition-colors ${
          isCurrent
            ? "bg-olive-100 border-2 border-olive-500"
            : "bg-white border border-stone-200 hover:border-olive-400"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            isCurrent ? "bg-olive-600 text-parchment" : "bg-stone-100 text-stone-600"
          }`}>
            {depth === 0 ? "⭑" : depth}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-serif text-lg text-stone-900 mb-1">{node.title}</div>
            {node.lede && <div className="text-sm text-stone-600 italic line-clamp-2">{node.lede}</div>}
            {node.published_at && (
              <div className="text-xs text-stone-500 mt-1">
                {new Date(node.published_at).toLocaleDateString("sv-SE", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </Link>
      {node.children && node.children.map(c => (
        <TreeNode key={c.id} node={c} currentSlug={currentSlug} depth={depth + 1} />
      ))}
    </div>
  );
}
