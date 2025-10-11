import HeroSection from "@/components/landing/hero-section"
import FeaturesSection from "@/components/landing/features-section"
import HowItWorksSection from "@/components/landing/how-it-works-section"
import BenefitsSection from "@/components/landing/benefits-section"
import DemoShowcaseSection from "@/components/landing/demo-showcase-section"
import FaqSection from "@/components/landing/faq-section"
import FinalCtaSection from "@/components/landing/final-cta-section"
import LandingFooter from "@/components/landing/footer"
import { Header } from "@/components/header"

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <DemoShowcaseSection />
      <FaqSection />
      <FinalCtaSection />
      <LandingFooter />
    </main>
  )
}

