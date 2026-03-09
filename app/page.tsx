import Footer from "@/components/Footer";
import Header from "@/components/Header";
import LandingHero from "@/components/LandingHero";
import config from "./config";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-rice-paper flex flex-col selection:bg-heritage-gold/30 selection:text-heritage-red relative overflow-hidden">
      <Header siteName={config.siteName} />

      <main className="flex-1 flex flex-col w-full">
        <LandingHero />
      </main>

      <Footer />
    </div>
  );
}
