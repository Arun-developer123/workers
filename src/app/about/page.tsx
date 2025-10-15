import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "About — KaamLink",
  description:
    "KaamLink connects verified local workers directly with customers and contractors — safe payments, SOS support, and transparent reviews.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center text-white font-bold">KL</div>
            <div>
              <h1 className="text-lg font-semibold">KaamLink</h1>
              <p className="text-xs text-gray-500">Digital Rozgaar for every mazdoor</p>
            </div>
          </div>

          <nav className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline">
              Home
            </Link>
            <Link href="/auth/sign-in" className="text-sm hover:underline">
              Sign in
            </Link>
            <Link href="/auth/sign-up" className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm shadow hover:bg-green-700">
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">About KaamLink</h2>
            <p className="text-lg text-gray-700 mb-6">
              KaamLink is built to give labourers direct, dignified access to work — without
              middlemen or daily uncertainty. We combine simple mobile-first design,
              identity verification, escrow payments and an emergency-first safety
              architecture so workers and customers can transact with trust.
            </p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <dt className="text-sm text-gray-500">Launch</dt>
                <dd className="mt-1 font-medium">2025 (Pilot)</dd>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <dt className="text-sm text-gray-500">Reach Goal</dt>
                <dd className="mt-1 font-medium">8M+ workers by 2029</dd>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <dt className="text-sm text-gray-500">Core Focus</dt>
                <dd className="mt-1 font-medium">Safety, trust, and income stability</dd>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <dt className="text-sm text-gray-500">Contact</dt>
                <dd className="mt-1 font-medium">
                  <a href="mailto:arunboth36@gmail.com" className="hover:underline">arunboth36@gmail.com</a>
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex gap-3">
              <Link href="/auth/sign-up" className="inline-flex items-center px-5 py-3 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700">
                Join as Worker
              </Link>

              <Link href="/auth/sign-in" className="inline-flex items-center px-5 py-3 rounded-lg bg-white border text-gray-800 hover:shadow">
                Hire Workers
              </Link>
            </div>
          </div>

          <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg">
            <Image src="/default-avatar.png" alt="Workers together" fill style={{ objectFit: "cover" }} priority />
          </div>
        </section>

        {/* Mission & How it works */}
        <section className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="md:col-span-2 bg-white p-6 rounded-2xl shadow">
            <h3 className="text-2xl font-semibold mb-4">Our Mission</h3>
            <p className="text-gray-700 leading-relaxed">
              Our mission is to remove the friction and exploitation that everyday workers
              face while looking for daily-wage work. We do this by providing a verified
              marketplace, secure payments, clear ratings and fast emergency assistance.
            </p>

            <h4 className="mt-6 font-semibold">How KaamLink Works</h4>
            <ol className="mt-3 list-decimal list-inside text-gray-700 space-y-2">
              <li>Worker registers and completes simple KYC & skill tagging.</li>
              <li>Customer posts a job and money is held in escrow.</li>
              <li>Nearby verified workers receive the job and accept.</li>
              <li>Worker completes the job — customer confirms — escrow is released.</li>
              <li>Mutual ratings build trust and prioritise top workers for future jobs.</li>
            </ol>
          </article>

          <aside className="bg-white p-6 rounded-2xl shadow">
            <h4 className="font-semibold">Key Features</h4>
            <ul className="mt-3 space-y-3 text-gray-700">
              <li>• KYC & Verified Profiles</li>
              <li>• Escrow Payments</li>
              <li>• SOS / Live Location Alerts</li>
              <li>• Masked Calls & In-app Chat</li>
              <li>• Ratings & Priority Listings</li>
            </ul>
          </aside>
        </section>

        {/* Team */}
        <section className="mt-12">
          <h3 className="text-2xl font-semibold mb-6">Team & Advisors</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Arun Both", role: "Founder & Product", mail: "arunboth36@gmail.com" },
              
            ].map((p) => (
              <div key={p.name} className="bg-white p-4 rounded-lg shadow text-center">
                <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto flex items-center justify-center text-xl font-semibold text-gray-600">{p.name.split(" ")[0][0]}</div>
                <h5 className="mt-3 font-semibold">{p.name}</h5>
                <p className="text-sm text-gray-500">{p.role}</p>
                {p.mail && (
                  <p className="mt-2 text-xs">
                    <a href={`mailto:${p.mail}`} className="text-green-600 hover:underline">{p.mail}</a>
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-12">
          <h3 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-medium">How do workers get paid?</summary>
              <p className="mt-2 text-gray-700">Payments are held in escrow and released after customer confirmation. Workers can withdraw to their bank or UPI.</p>
            </details>

            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-medium">What if there is an emergency on site?</summary>
              <p className="mt-2 text-gray-700">Use the SOS button — the admin receives live location and emergency contacts are alerted. We also integrate with local helplines in pilot regions.</p>
            </details>

            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-medium">How is worker privacy protected?</summary>
              <p className="mt-2 text-gray-700">Calls are masked, personal numbers are never shared, and we only collect minimum data required for verification.</p>
            </details>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-12 bg-white p-6 rounded-2xl shadow text-center">
          <h4 className="text-xl font-semibold">Ready to make work easier and safer?</h4>
          <p className="text-gray-700 mt-2">Join KaamLink — whether you are a worker, contractor or partner organisation.</p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/auth/sign-up" className="px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700">Sign up</Link>
            <Link href="/contact" className="px-6 py-3 rounded-lg bg-white border">Contact us</Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-600">© {new Date().getFullYear()} KaamLink. All rights reserved.</p>
          <p className="text-sm">
            Built by <a href="mailto:arunboth36@gmail.com" className="text-green-600 hover:underline">Arun </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
