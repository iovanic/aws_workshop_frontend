import { DroneCard } from "@/components/DroneCard";
import { DRONES } from "@/data/drones";
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
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DRONES.map((drone) => (
            <li key={drone.id}>
              <DroneCard drone={drone} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
