import Navigation from "@/components/Navigation/Navigation";
import { Footer } from '@/components/Footer';
import HomeHero from '@/components/HomeHero';
import LiveSection from '@/components/LiveSection';
import CartSection from '@/components/CartSection';

export default function HomeLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="bg-dark text-white min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        {children || (
          <>
            <HomeHero />
            <LiveSection />
            <CartSection />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
