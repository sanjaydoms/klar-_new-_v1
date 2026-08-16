import ContactSection from '@/components/ContactUS/ContactSection';
import ContactUsHero from '@/components/ContactUS/ContactUsHero';
import GetInTouch from '@/components/ContactUS/GetInTouch';
import Footer from '@/components/layout/Footer';

export default function ContactUs() {
  return (
    <main>
      <ContactUsHero />
      <ContactSection />
      <GetInTouch />
      <Footer />
    </main>
  );
}
