// src/app/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Mail, Users, ShieldCheck, Activity, Bolt } from "lucide-react";
import { motion } from "framer-motion";

const featureList = [
  {
    title: "Registration & Verification",
    desc: "Simple KYC, skill tags and verified badge to build trust.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: "Escrow Payments",
    desc: "Customer pays into escrow — release only after job completion.",
    icon: <ShieldCheck className="w-6 h-6" />,
  },
  {
    title: "SOS & Safety",
    desc: "Emergency button sends live location to admin & emergency contacts.",
    icon: <Activity className="w-6 h-6" />,
  },
  {
    title: "Ratings & Feedback",
    desc: "Mutual reviews reward top performers and reduce fraud.",
    icon: <Bolt className="w-6 h-6" />,
  },
  {
    title: "In-app Chat & Masking",
    desc: "Direct communication while keeping personal numbers private.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: "Admin Analytics",
    desc: "Manage verifications, monitor jobs and respond to alerts quickly.",
    icon: <Activity className="w-6 h-6" />,
  },
];

// at top of app/page.tsx
export const metadata = {
  title: "KaamLink — Digital Rozgaar for Every Worker",
  description: "KaamLink connects verified local workers directly to customers — escrow payments, SOS, verified profiles and fair pay.",
  openGraph: {
    title: "KaamLink — Digital Rozgaar for Every Worker",
    description: "Verified workers • Escrow payments • SOS • Transparent reviews.",
    url: "https://workers-taupe.vercel.app/",
    images: ["/workers-og.png"],
  },
};


export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900 antialiased">
      {/* Decorative floating shapes */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <motion.div
          initial={{ opacity: 0.18, y: -20 }}
          animate={{ y: 20 }}
          transition={{ repeat: Infinity, duration: 8, repeatType: "reverse" }}
          className="absolute -left-10 top-8 w-72 h-72 rounded-full bg-gradient-to-tr from-green-200 to-blue-100 blur-3xl opacity-90"
        />
        <motion.div
          initial={{ opacity: 0.12, y: 10 }}
          animate={{ y: -10 }}
          transition={{ repeat: Infinity, duration: 10, repeatType: "reverse" }}
          className="absolute right-8 bottom-8 w-56 h-56 rounded-2xl bg-gradient-to-tr from-pink-100 to-purple-100 blur-2xl opacity-80"
        />
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              KaamLink — <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-teal-500">Har Mazdoor</span> ke liye
              <span className="ml-2 inline-block text-lg font-medium px-3 py-1 rounded-full bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 shadow-sm">Digital Rozgaar</span>
            </h1>

            <p className="text-lg text-gray-700 max-w-xl">
              Workers ko direct customers aur contractors se jodna — bina middleman ke.
              Secure payments, verified profiles, emergency support, aur transparent reviews ke saath. Mobile-first design, local-first impact.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/auth/sign-up"
                  className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-green-600 to-teal-500 text-white font-semibold shadow-lg hover:brightness-105 transition"
                >
                  Naya Khata Banayein
                  <span className="inline-block w-3 h-3 bg-white rounded-full shadow-sm" />
                </Link>
              </motion.div>

              <motion.div whileHover={{ y: -2 }}>
                <Link
                  href="/auth/sign-in"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-medium shadow-sm hover:shadow-md transition"
                >
                  Login Karein
                </Link>
              </motion.div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 max-w-sm text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                Verified worker profiles
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                Escrow payments for safety
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                SOS / Emergency alerts
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
                Rating & priority listing
              </div>
            </div>
          </motion.div>

          {/* Right - image card with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="relative w-full h-96 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/30"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-black/5 pointer-events-none" />
            <Image
              src="/workers.jpg"
              alt="Workers helping each other"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
            <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-white/40">
              <div className="text-sm font-semibold">Trusted local workers</div>
              <div className="text-xs text-gray-600">Verified profiles • Escrow payments • SOS</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features - animated grid */}
      <section className="max-w-6xl mx-auto px-6 lg:px-8 pb-12">
        <h2 className="text-2xl font-semibold text-center mb-8">Core Features</h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.12,
              },
            },
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {featureList.map((f, i) => (
            <motion.article
              key={f.title}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              whileHover={{ scale: 1.03, translateY: -4 }}
              transition={{ type: "spring", stiffness: 260, damping: 25 }}
              className="relative bg-white p-6 rounded-2xl shadow-lg border border-transparent hover:border-green-200"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-teal-50 text-green-700 shadow-inner">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{f.desc}</p>
                </div>
              </div>

              {/* subtle glow */}
              <div className="pointer-events-none absolute -z-10 inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all" />
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* Impact strip with glass cards */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: "Projected reach by 2029", value: "8M+ Workers" },
            { label: "Avg. commission saved / worker", value: "₹3,400" },
            { label: "Jobs posted monthly", value: "120K+" },
          ].map((s) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.02 }}
              className="bg-white/80 backdrop-blur-sm border border-white/40 rounded-2xl p-6 shadow-md text-center"
            >
              <p className="text-sm text-gray-600">{s.label}</p>
              <div className="mt-3 text-2xl font-bold text-gray-900">{s.value}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Emergency callout */}
      <section className="max-w-5xl mx-auto px-6 lg:px-8 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-red-50 to-red-25 border-l-4 border-red-600 rounded-lg p-6 shadow"
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow">SOS</div>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-red-700 mb-1">Emergency-first design</h4>
              <p className="text-gray-700">Built-in SOS, quick-response admin dashboard, and local help dispatch — worker safety is our top priority.</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div>
            <h5 className="font-bold text-lg">KaamLink</h5>
            <p className="text-sm text-gray-600 mt-2 max-w-sm">Connecting workers directly to work. Safe. Transparent. Local-first. Built with care for field realities.</p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm text-gray-600">
              <Mail className="w-4 h-4" />
              <a href="mailto:arunboth36@gmail.com" className="hover:underline">arunboth36@gmail.com</a>
            </div>
          </div>

          <div>
            <h6 className="font-semibold mb-2">Quick Links</h6>
            <ul className="text-sm text-gray-600 space-y-2">
              <li><Link href="/auth/sign-up" className="hover:underline">Sign Up</Link></li>
              <li><Link href="/auth/sign-in" className="hover:underline">Sign In</Link></li>
              <li><Link href="/about" className="hover:underline">About</Link></li>
            </ul>
          </div>

          <div>
            <h6 className="font-semibold mb-2">Get Started</h6>
            <p className="text-sm text-gray-600">Join as a worker or hire labour for your project. Fast onboarding, minimal KYC.</p>
            <div className="mt-4 flex gap-3">
              <Link href="/auth/sign-up" className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">Join as Worker</Link>
              <Link href="/auth/sign-in" className="px-4 py-2 rounded-lg bg-white border text-sm">Hire Workers</Link>
            </div>
          </div>
        </div>

        <div className="border-t bg-white/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 text-sm text-gray-600 flex flex-col md:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} KaamLink. All rights reserved.</span>
            <span>Built by <a href="mailto:arunboth36@gmail.com" className="text-green-600 hover:underline">Arun </a></span>
          </div>
        </div>
      </footer>
    </main>
  );
}
