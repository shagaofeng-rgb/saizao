import { getPublishedProductCategories } from "@/lib/retail-data";

export async function GET() {
  const categories = await getPublishedProductCategories();
  return Response.json(
    { categories },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
