import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Bento from "@/components/Bento";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";
import SectionFeature from "@/components/marketplace/SectionFeature";
import FarmerCaseVisual from "@/components/marketplace/FarmerCaseVisual";
import VendorBidVisual from "@/components/marketplace/VendorBidVisual";
import EscrowVisual from "@/components/marketplace/EscrowVisual";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F0EB]">
      <Nav />
      <Hero />
      <Bento />
      <SectionFeature
        label="🌾 For Farmers"
        heading="Upload. Diagnose. Get treated."
        subtext="No more guessing what's wrong with your crops. Get expert AI diagnosis instantly and only pay when treatment is confirmed delivered."
        visual={<FarmerCaseVisual />}
      />
      <SectionFeature
        label="🏪 For Vendors"
        heading="Bid on cases. Get paid guaranteed."
        subtext="Browse open cases from farmers near you. Submit your proposal and price. Smart contract guarantees payment when you deliver."
        visual={<VendorBidVisual />}
        reverse
      />
      <SectionFeature
        label="🔒 Trustless Escrow"
        heading="Funds locked until treatment works."
        subtext="Built on Stellar using Trustless Work. Escrow holds funds in a smart contract — released automatically when farmer confirms treatment."
        visual={<EscrowVisual />}
      />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}
