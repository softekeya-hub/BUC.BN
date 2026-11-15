import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { formatKes } from '../data/schools';

interface HeaderProps {
  cartCount: number;
  cartTotalKes: number;
  onOpenCart: () => void;
  onOpenSizeGuide: () => void;
  onOpenLedger: () => void;
}

export function Header({
  cartCount,
  cartTotalKes,
  onOpenCart,
  onOpenSizeGuide,
  onOpenLedger,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Slim non-sticky store hours strip (<= 32px) */}
      <div className="hidden bg-[#0B1B42] text-slate-200 sm:block">
        <div className="mx-auto flex h-8 max-w-7xl items-center justify-between px-4 text-xs sm:px-6 lg:px-8">
          <p className="truncate">
            Banana Hill Shopping Centre, Ruaka–Limuru Road <span aria-hidden="true">·</span> Mon–Sat
            8:00 AM – 6:30 PM
          </p>
          <p className="font-mono text-[11px] text-amber-300 tabular-nums whitespace-nowrap">
            2-Hr Store Pickup · +254 703 919406
          </p>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0B1B42]"
          >
            <img
              src="/assets/aistudio/image_89c10cc6.png"
              alt="Banana Uniform Centre crest"
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-lg bg-[#0B1B42] object-contain p-1 shadow-xs"
            />
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              Banana Uniform Centre
            </span>
          </a>

          {/* Zone 2: 5 Single-Line Text Navigation Links */}
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <a
              href="#schools"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#0B1B42] hover:underline hover:underline-offset-4"
            >
              Schools
            </a>
            <a
              href="#uniform-angles"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#0B1B42] hover:underline hover:underline-offset-4"
            >
              3-Angle Preview
            </a>
            <button
              type="button"
              onClick={onOpenSizeGuide}
              className="whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 hover:text-[#0B1B42] hover:underline hover:underline-offset-4"
            >
              Size Guide
            </button>
            <button
              type="button"
              onClick={onOpenLedger}
              className="whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 hover:text-[#0B1B42] hover:underline hover:underline-offset-4"
            >
              M-Pesa Ledger
            </button>
            <a
              href="#visit-store"
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#0B1B42] hover:underline hover:underline-offset-4"
            >
              Visit Store
            </a>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#0B1B42] px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#162C63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1B42] whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Cart ({cartCount})</span>
              {cartCount > 0 && (
                <span className="hidden font-mono text-xs text-amber-300 tabular-nums sm:inline">
                  · {formatKes(cartTotalKes)}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 lg:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <a
                href="#schools"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Schools Directory (30)
              </a>
              <a
                href="#uniform-angles"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                3-Angle Uniform Preview
              </a>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSizeGuide();
                }}
                className="rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                Size Guide &amp; Growth Room
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenLedger();
                }}
                className="rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                Orders &amp; M-Pesa Ledger
              </button>
              <a
                href="#visit-store"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              >
                Visit Banana Hill Store
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
