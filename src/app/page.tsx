import { CatalogGrid } from "@/components/CatalogGrid";
import { getShopName } from "@/lib/getShopName";

export default function Home() {
  const shopName = getShopName();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <h1
          className="mb-8 text-3xl font-bold tracking-tight text-sky-100 md:text-4xl"
          style={{ fontFamily: "var(--font-geist-sans), system-ui" }}
        >
          Catálogo {shopName}
        </h1>

        <CatalogGrid />
      </section>
    </div>
  );
}
