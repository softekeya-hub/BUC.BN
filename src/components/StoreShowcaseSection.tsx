import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import primaryStudentsImg from '../assets/images/students_primary_smiling_1794777524524.jpg';

export function StoreShowcaseSection() {
  return (
    <section id="visit-store" className="border-t border-slate-200 bg-[#F7F8FA] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-[#1E3A8A]">
            Banana Hill Flagship Store <span aria-hidden="true">·</span> Ruaka–Limuru Road
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900 [text-wrap:balance] sm:text-4xl">
            Visit Our Storefront or Order Express Boda Delivery
          </h2>
        </div>

        <div className="grid items-stretch gap-8 lg:grid-cols-12">
          {/* Left: Editorial Photography Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
            <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/70">
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <img
                  src={primaryStudentsImg}
                  alt="Smiling Kenyan primary school students wearing neat sky-blue and navy uniforms"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-[#1E3A8A]">
                  CBC Primary &amp; Junior School
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                  Built for Comfort &amp; Growth Room
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Color-fast fabrics, generous hem allowances, and durable stitching stocked
                  year-round for Ruaka, Banana Hill, Muchatha, and Ndenderu families.
                </p>
              </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xs ring-1 ring-slate-200/70">
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-11-16_at_00.08.18_00c07c33.jpeg"
                  alt="Banana Uniform Centre shopfront sign — Dressing To Inspire Success"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <p className="text-xs font-medium text-amber-700">Dressing To Inspire Success</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                  Banana Hill Physical Shopfront
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Walk in along the Ruaka–Limuru Road at Banana Hill to verify exact school shades,
                  try on blazers, or pick up your 2-hour express order.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Clean Architectural Store Card */}
          <div className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-xs ring-1 ring-slate-200/70 sm:p-7 lg:col-span-5">
            <div>
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-5">
                <img
                  src="/assets/aistudio/image_89c10cc6.png"
                  alt="Banana Uniform Centre BUC Emblem"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 rounded-xl bg-[#0B1B42] object-contain p-1.5"
                />
                <div>
                  <h3 className="font-display text-xl font-semibold text-slate-900">
                    Banana Uniform Centre
                  </h3>
                  <p className="text-xs text-slate-500">
                    Banana Hill <span aria-hidden="true">·</span> Ruaka–Limuru Road, Kiambu
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-sm text-slate-700">
                <div className="flex items-start gap-3 py-4">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1B42]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">Store Location</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      Banana Hill Shopping Centre, along Ruaka–Limuru Road, Kiambaa Sub-County,
                      Kiambu County.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1B42]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">Opening Hours &amp; Express Pickup</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      Mon – Sat: 8:00 AM – 6:30 PM <span aria-hidden="true">·</span> Online kits
                      packed in 2 hours; same-day boda delivery across Ruaka, Muchatha, Ndenderu
                      &amp; Limuru Rd.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-4">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#0B1B42]" aria-hidden="true" />
                  <div>
                    <p className="font-semibold text-slate-900">Direct Shop Desk</p>
                    <div className="mt-1 space-y-1 font-mono text-xs">
                      <a
                        href="tel:+254703919406"
                        className="block font-semibold text-[#1E3A8A] hover:underline"
                      >
                        +254 703 919406 — Tom Njenga Mwangi
                      </a>
                      <a
                        href="tel:+254721476461"
                        className="block font-semibold text-[#1E3A8A] hover:underline"
                      >
                        0721 476 461 (Alternative Desk)
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <a
                href="https://wa.me/254703919406?text=Hello%20Banana%20Uniform%20Centre%2C%20I%20would%20like%20assistance%20with%20a%20school%20uniform."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Chat on WhatsApp</span>
              </a>
              <a
                href="tel:+254703919406"
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:border-[#0B1B42] hover:text-[#0B1B42] whitespace-nowrap"
              >
                <Phone className="h-4 w-4 text-[#0B1B42]" aria-hidden="true" />
                <span>Call +254 703 919406</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
