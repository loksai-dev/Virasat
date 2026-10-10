import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Sparkles, 
  Building2, 
  ArrowRight, 
  Menu, 
  X, 
  Heart, 
  PhoneCall,
  Award,
  Globe
} from 'lucide-react';
import { LanguageSwitcher, ToastProvider, PageTransition } from '@/components';
import { useVirasatStore } from '@/store/useVirasatStore';

export const PublicLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { label: 'Product', href: '#product' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'For Banks', href: '#for-banks' },
    { label: 'Impact', href: '/impact' },
    { label: 'Security', href: '#security' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (href.startsWith('/')) {
      navigate(href);
      return;
    }

    if (location.pathname !== '/') {
      navigate('/' + href);
      return;
    }

    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-warm-sand text-navy">
      <ToastProvider />

      {/* 1. Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Left */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-accent to-gold p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-navy rounded-[10px] flex items-center justify-center text-white font-serif font-bold text-xl group-hover:bg-transparent transition-colors">
                V
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-serif font-bold tracking-tight text-navy flex items-center gap-1.5 leading-none">
                Virasat
                <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 font-sans px-1.5 py-0.2 rounded font-semibold">
                  AI Estate Care
                </span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal italic mt-0.5">
                Every legacy, settled with care.
              </span>
            </div>
          </Link>

          {/* Center Links (Desktop 1440px) */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="hover:text-teal-700 transition-colors py-1 cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <LanguageSwitcher />

            {/* "Try Live Demo" (teal outline) */}
            <Link
              to="/demo"
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold border-2 border-teal-accent text-teal-700 hover:bg-teal-50 transition-all shadow-xs"
            >
              Try Live Demo
            </Link>

            {/* "Get Started" (navy filled) */}
            <Link
              to="/demo"
              className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-navy text-white hover:bg-navy-light shadow-soft transition-all"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button (390px) */}
          <div className="flex items-center gap-2 lg:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-200 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-2 px-2 text-sm font-medium text-slate-700">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-navy transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="pt-2 px-2 flex flex-col gap-2 border-t border-slate-100">
              <Link
                to="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold border-2 border-teal-accent text-teal-700 hover:bg-teal-50"
              >
                Try Live Demo
              </Link>
              <Link
                to="/demo"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-navy text-white hover:bg-navy-light"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      {/* 12. Footer */}
      <footer className="w-full bg-navy text-white border-t border-navy-light pt-12 pb-8 px-4 md:px-8 mt-16">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand column */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-accent to-gold p-0.5 flex items-center justify-center">
                  <div className="w-full h-full bg-navy rounded-[10px] flex items-center justify-center text-white font-serif font-bold text-lg">
                    V
                  </div>
                </div>
                <div>
                  <div className="text-xl font-serif font-bold tracking-tight text-white">Virasat</div>
                  <div className="text-xs text-slate-400 italic">Every legacy, settled with care.</div>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                AI-powered estate settlement platform helping Indian families access and transfer bank accounts, insurance, investments, and property with dignity, transparency, and speed.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs text-amber-300 font-medium">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Built for AI Builder Cup 2026</span>
              </div>
            </div>

            {/* Links Columns */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">Product</div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><a href="#product" className="hover:text-white transition-colors">Asset Discovery Agent</a></li>
                <li><a href="#product" className="hover:text-white transition-colors">Legal Eligibility Graph</a></li>
                <li><a href="#product" className="hover:text-white transition-colors">Claim Packet Auto-fill</a></li>
                <li><a href="#product" className="hover:text-white transition-colors">Fraud & Dispute Shield</a></li>
                <li><Link to="/demo" className="text-teal-300 hover:text-white font-medium">Try Live Demo →</Link></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">Solutions</div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><Link to="/how-it-works" className="text-amber-300 hover:text-white font-medium">Under the Hood (For Judges) ⚡</Link></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">For Grieving Families</a></li>
                <li><a href="#for-banks" className="hover:text-white transition-colors">For Banks & Insurers</a></li>
                <li><Link to="/institution" className="hover:text-white transition-colors">Institutional STP Console</Link></li>
                <li><Link to="/impact" className="hover:text-white transition-colors">Impact & Statistics</Link></li>
                <li><a href="#security" className="hover:text-white transition-colors">Security & DigiLocker</a></li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">Trust & Legal</div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li><span className="hover:text-white cursor-pointer">Privacy & Data Vault</span></li>
                <li><span className="hover:text-white cursor-pointer">Terms of Service</span></li>
                <li><span className="hover:text-white cursor-pointer">Grievance Redressal</span></li>
                <li><span className="hover:text-white cursor-pointer">Security Whitepaper</span></li>
                <li className="pt-2 text-slate-400">
                  <span className="block text-[11px] text-slate-400">Helpline:</span>
                  <strong className="text-white font-mono">1800-VIRASAT</strong>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar with Language Switcher and Mandatory Disclaimer */}
          <div className="pt-6 border-t border-navy-light/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            {/* Disclaimer */}
            <div className="flex items-center gap-2 text-center md:text-left">
              <Shield className="w-4 h-4 text-teal-400 shrink-0" />
              <p>
                <strong className="text-white">Legal Disclaimer:</strong> Virasat provides guidance, not legal advice. For contentious litigation or probate disputes, independent advocate representation is advised.
              </p>
            </div>

            {/* Language & Copyright */}
            <div className="flex items-center gap-4 shrink-0 flex-wrap justify-center">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <LanguageSwitcher />
              </div>

              <span>© 2026 Virasat. Built for AI Builder Cup 2026.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
