import type { Metadata } from "next";
import localFont from "next/font/local";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import { getCatalogForRequest } from "@/lib/catalog-server";
import { getShopName } from "@/lib/getShopName";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const shopName = getShopName();
  return {
    title: `${shopName} — tienda de drones (demo)`,
    description:
      "Catálogo de drones ficticios, carrito y checkout. Next.js + TypeScript.",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const shopName = getShopName();
  const initialCatalog = await getCatalogForRequest();

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <Providers shopName={shopName} initialCatalog={initialCatalog}>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
