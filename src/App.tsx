import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Shop from "./pages/Shop";
import Admin from "./pages/Admin";
import Login from "./pages/Login";
import { ShoppingBag, LayoutDashboard, Instagram, Mail, Phone, MapPin, MessageCircle, ChevronUp, Menu, X } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  return isAdmin ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isRestrictedPage = location.pathname === '/login' || location.pathname.startsWith('/admin');

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      {!isRestrictedPage && (
        <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-24 items-center">
              {/* Logo on Left */}
              <div className="flex items-center">
                <Link to="/" className="w-20 h-20 bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
                  <img src="/images/vjlogo.jpeg" alt="VJ Crackers" className="w-full h-full object-contain" />
                </Link>
              </div>

              {/* Desktop Navigation Links on Right */}
              <div className="hidden md:flex items-center gap-6">
                <a href="https://vjcracker.com/" className="text-stone-600 hover:text-red-600 font-bold transition-colors">Home</a>
                <a href="https://vjcracker.com/about-us/" className="text-stone-600 hover:text-red-600 font-bold transition-colors">About Us</a>
                <a href="https://vjcracker.com/chit-fund/" className="text-stone-600 hover:text-red-600 font-bold transition-colors">Chit Fund</a>
                <a href="https://vjcracker.com/contact-us/" className="text-stone-600 hover:text-red-600 font-bold transition-colors">Contact Us</a>
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden flex items-center">
                <button
                  onClick={toggleMenu}
                  className="p-2 text-stone-600 hover:text-red-600 transition-colors"
                  aria-label="Toggle menu"
                >
                  <Menu size={32} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Overlay */}
          <div 
            className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 md:hidden ${
              isMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            }`}
            onClick={toggleMenu}
          />

          {/* Mobile Sidebar Content */}
          <div 
            className={`fixed top-0 right-0 h-full w-[280px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
              isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b border-stone-100">
                <span className="font-black text-xl text-red-600 italic">VJ Crackers</span>
                <button 
                  onClick={toggleMenu}
                  className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex flex-col py-6">
                <a 
                  href="https://vjcracker.com/" 
                  className="px-8 py-4 text-stone-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all flex items-center gap-3"
                  onClick={toggleMenu}
                >
                  Home
                </a>
                <a 
                  href="https://vjcracker.com/about-us/" 
                  className="px-8 py-4 text-stone-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all flex items-center gap-3"
                  onClick={toggleMenu}
                >
                  About Us
                </a>
                <a 
                  href="https://vjcracker.com/chit-fund/" 
                  className="px-8 py-4 text-stone-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all flex items-center gap-3"
                  onClick={toggleMenu}
                >
                  Chit Fund
                </a>
                <a 
                  href="https://vjcracker.com/contact-us/" 
                  className="px-8 py-4 text-stone-600 hover:bg-red-50 hover:text-red-600 font-bold transition-all flex items-center gap-3"
                  onClick={toggleMenu}
                >
                  Contact Us
                </a>
                <Link 
                  to="/" 
                  className="mx-6 mt-4 bg-red-600 text-white px-6 py-3 rounded-xl font-black text-center shadow-lg shadow-red-200 hover:bg-red-500 transition-all"
                  onClick={toggleMenu}
                >
                  Shop Now
                </Link>
              </div>

              {/* Mobile Contact Info */}
              <div className="mt-auto p-8 bg-stone-50 space-y-4">
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <Phone size={18} />
                  <span>+91 8637641790</span>
                </div>
                <div className="flex items-center gap-3 text-stone-600 text-sm">
                  <Mail size={18} />
                  <span>info@vjcracker.com</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto py-8">
        <Routes>
          <Route path="/" element={<Shop />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>

      {!isRestrictedPage && <Footer />}

      {/* Floating Buttons */}
      {!isRestrictedPage && (
        <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          <a
            href="https://wa.me/918637641790"
            target="_blank"
            rel="noopener noreferrer"
            className="w-14 h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform animate-whatsapp-blink"
            aria-label="Contact on WhatsApp"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          </a>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-12 h-12 bg-white text-stone-900 rounded-full flex items-center justify-center shadow-xl hover:bg-stone-50 transition-colors border border-stone-100"
          >
            <ChevronUp size={24} />
          </button>
        </div>
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative bg-[#CB2E0D] text-white overflow-hidden">
      {/* Mandala Patterns (Subtle Overlays) */}
      <div className="absolute top-0 left-0 w-64 h-64 opacity-10 -translate-x-1/2 -translate-y-1/2">
        <img src="https://www.transparentpng.com/download/mandala/mandala-transparent-images--1.png" alt="" className="w-full h-full rotate-45" />
      </div>
      <div className="absolute bottom-0 right-0 w-96 h-96 opacity-10 translate-x-1/3 translate-y-1/3">
        <img src="https://www.transparentpng.com/download/mandala/mandala-transparent-images--1.png" alt="" className="w-full h-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl w-fit">
              <img src="/images/vjlogo.jpeg" alt="VJ Crackers" className="h-16 w-auto" />
            </div>
            <p className="text-white/80 text-sm leading-relaxed max-w-sm">
              VJ Crackers delivers premium Sivakasi crackers with quality, safety, and unbeatable wholesale & retail prices.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <MapPin className="w-5 h-5 text-white flex-shrink-0 mt-1" />
                <span className="text-sm text-white/90 italic">
                  No opposite, south side metric school to, <br />
                  Sattur Rd, Mettamalai, sivakasi, <br />
                  Tamil Nadu 626189
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <Phone className="w-5 h-5 text-white" />
                <span className="text-sm text-white/90">
                  +91 8637641790, +91 8825554131
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <Mail className="w-5 h-5 text-white" />
                <a href="mailto:info@vjcracker.com" className="text-sm text-white/90 hover:underline">
                  info@vjcracker.com
                </a>
              </div>
            </div>
          </div>

          {/* Our Links */}
          <div>
            <h4 className="text-xl font-black mb-6 border-b-2 border-white/20 pb-2 w-fit">Our Link</h4>
            <ul className="space-y-3 font-bold text-white/90">
              <li><a href="https://vjcracker.com/" className="hover:translate-x-1 transition-transform inline-block">Home</a></li>
              <li><a href="https://vjcracker.com/about-us/" className="hover:translate-x-1 transition-transform inline-block">About Us</a></li>
              <li><Link to="/" className="hover:translate-x-1 transition-transform inline-block">Shop</Link></li>
              <li><a href="https://vjcracker.com/contact-us/" className="hover:translate-x-1 transition-transform inline-block">Contact</a></li>
            </ul>
          </div>

          {/* Useful Links & Social */}
          <div className="space-y-10">
            <div>
              <h4 className="text-xl font-black mb-6 border-b-2 border-white/20 pb-2 w-fit">Useful Links</h4>
              <ul className="space-y-3 font-bold text-white/90">
                <li><a href="https://vjcracker.com/terms-conditions/" className="hover:translate-x-1 transition-transform inline-block">Terms & Conditions</a></li>
                <li><a href="https://vjcracker.com/privacy-policy/" className="hover:translate-x-1 transition-transform inline-block">Privacy Policy</a></li>
                <li><a href="https://vjcracker.com/refund_returns/" className="hover:translate-x-1 transition-transform inline-block">Returns & Refund</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xl font-black mb-4">Social Media Links</h4>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/vjcrackers?utm_source=qr&igsh=cWtpZ2JiczQyam1i" target="_blank" className="p-3 bg-stone-900/30 rounded-xl hover:bg-stone-900/50 transition-colors">
                  <Instagram size={24} />
                </a>
              </div>
            </div>
          </div>

          {/* Maps */}
          <div>
            <div className="rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl h-64">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3934.34739506691!2d77.85!3d9.5!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b06cfeabbbbbbbb%3A0x0!2zOcKwMzAnMDAuMCJOIDc3wrA1MScwMC4wIkU!5e0!3m2!1sen!2sin!4v1710590000000!5m2!1sen!2sin" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-white/60">
          <div>Copyright @ 2026 All Right Reserved VJ Crackers</div>
          <div>  Developed By  <a href="https://tamizhasolutions.com/">Tamizha Software Solutions.</a> </div>
        </div>
      </div>
    </footer>
  );
}
