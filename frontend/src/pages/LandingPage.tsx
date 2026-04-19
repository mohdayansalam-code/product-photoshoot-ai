import { useState, useEffect } from "react";
import { motion, type Easing } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import {
  Camera, Sparkles, ArrowRight, Play, Mail, Eraser, Maximize,
  Image, Wand2, FolderOpen, ShoppingBag, Palette, Users,
  Store, Briefcase, ChevronRight
} from "lucide-react";

import heroImg1 from "@/assets/landing-hero-1.jpg";
import heroImg2 from "@/assets/landing-hero-2.jpg";
import heroImg3 from "@/assets/landing-hero-3.jpg";
import heroImg4 from "@/assets/landing-hero-4.jpg";
import heroImg5 from "@/assets/landing-hero-5.jpg";
import dashboardPreview from "@/assets/landing-dashboard-preview.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as Easing },
  }),
};

const FEATURE_TABS = [
  { label: "Images", icon: Image },
  { label: "Background Removal", icon: Eraser },
  { label: "White Background", icon: Maximize },
  { label: "Upscale", icon: Maximize },
  { label: "AI Enhancement", icon: Wand2 },
];

const PRODUCT_IMAGES = [heroImg1, heroImg2, heroImg3, heroImg4, heroImg5, heroImg1];

const FOR_WHOM = [
  {
    title: "For Ecommerce Sellers",
    description: "Create professional product images without expensive studios.",
    icon: ShoppingBag,
  },
  {
    title: "For Shopify Brands",
    description: "Generate marketing photos for product pages and ads.",
    icon: Store,
  },
  {
    title: "For Designers & Agencies",
    description: "Create stunning product visuals for client campaigns.",
    icon: Briefcase,
  },
];

const TOOL_FEATURES = [
  { label: "AI Photoshoot Generator", icon: Camera },
  { label: "Background Removal", icon: Eraser },
  { label: "AI Image Editor", icon: Palette },
  { label: "Asset Library", icon: FolderOpen },
  { label: "Projects Management", icon: Users },
];

const FOOTER_LINKS = ["Home", "Features", "Pricing", "Docs", "Contact"];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">PhotoAI</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
            <a href="#for-whom" className="hover:text-slate-900 transition-colors">Use Cases</a>
            <a href="#tools" className="hover:text-slate-900 transition-colors">Platform</a>
            <a href="#demo" className="hover:text-slate-900 transition-colors">Demo</a>
          </div>
          <Button onClick={handleGoogleLogin} className="rounded-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 px-6">
            Continue with Google
          </Button>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="space-y-8">
          <motion.div variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-600 text-sm font-medium px-4 py-1.5 mb-6">
              <Sparkles className="h-4 w-4" /> AI-Powered Product Photography
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} custom={1} className="text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
            Generate Stunning AI Product Photos{" "}
            <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">Instantly</span>
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-slate-500 max-w-lg leading-relaxed">
            Upload your product and create studio-quality ecommerce photos in seconds using AI. No photoshoots, no designers, no waiting.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-4">
            <Button onClick={handleGoogleLogin} size="lg" className="rounded-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow-lg shadow-blue-500/25 px-8 text-base h-12">
              <Camera className="h-5 w-5 mr-2" /> Continue with Google
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-slate-200 hover:bg-slate-50 px-8 text-base h-12">
              <a href="#features">See Examples <ArrowRight className="h-4 w-4 ml-2" /></a>
            </Button>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="flex items-center gap-3 pt-2">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-500">Trusted by <span className="font-semibold text-slate-900">20K+</span> ecommerce brands</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid grid-cols-2 gap-4"
        >
          {[heroImg1, heroImg2, heroImg3, heroImg4].map((img, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className={`rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 ${i === 0 ? "row-span-2" : ""}`}
            >
              <img src={img} alt="AI generated product" className={`w-full object-cover ${i === 0 ? "h-full" : "aspect-square"}`} loading="lazy" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FEATURE PREVIEW */}
      <section id="features" className="bg-slate-50/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              Smart & Fast{" "}
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">AI Generation</span>
            </h2>
            <p className="text-slate-500 text-lg mt-4 max-w-2xl mx-auto">Professional product photos at the click of a button with our suite of AI tools.</p>
          </motion.div>

          <div className="grid lg:grid-cols-[240px_1fr] gap-8">
            <div className="flex lg:flex-col gap-2">
              {FEATURE_TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all text-left ${activeTab === i
                      ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-100"
                    }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                </button>
              ))}
            </div>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              {PRODUCT_IMAGES.map((img, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -6, boxShadow: "0 20px 60px -15px rgba(59,130,246,0.2)" }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-lg shadow-slate-100/50"
                >
                  <img src={img} alt="Product" className="w-full aspect-square object-cover" loading="lazy" />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* FOR WHOM */}
      <section id="for-whom" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              Built{" "}
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">For</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {FOR_WHOM.map((card, i) => (
              <motion.div
                key={card.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -8, boxShadow: "0 20px 60px -15px rgba(59,130,246,0.15)" }}
                className="rounded-2xl border border-slate-100 bg-white p-8 space-y-4 transition-colors hover:border-blue-200"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <card.icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold">{card.title}</h3>
                <p className="text-slate-500 leading-relaxed">{card.description}</p>
                <button className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Learn more <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TOOL HIGHLIGHTS */}
      <section id="tools" className="bg-slate-50/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              Platform{" "}
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">Overview</span>
            </h2>
            <p className="text-slate-500 text-lg mt-4 max-w-2xl mx-auto">Everything you need to create, manage, and export professional product photos.</p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50 mb-12"
          >
            <img src={dashboardPreview} alt="Platform dashboard preview" className="w-full" loading="lazy" />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {TOOL_FEATURES.map((feat, i) => (
              <motion.div
                key={feat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4 }}
                className="flex flex-col items-center gap-3 rounded-2xl bg-white border border-slate-100 p-6 text-center"
              >
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                  <feat.icon className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{feat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO DEMO */}
      <section id="demo" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              See AI Photoshoots{" "}
              <span className="bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent">in Action</span>
            </h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            whileHover={{ scale: 1.01 }}
            className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/50 cursor-pointer group"
          >
            <img src={dashboardPreview} alt="Video demo" className="w-full" loading="lazy" />
            <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="h-8 w-8 text-blue-600 ml-1" fill="currentColor" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 p-16 text-center text-white shadow-2xl shadow-blue-500/30"
          >
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">Start Creating AI Product Photos Today</h2>
            <p className="text-blue-100 text-lg mb-8">No design skills required</p>
            <Button asChild size="lg" className="rounded-full bg-white text-blue-600 hover:bg-blue-50 shadow-lg px-10 text-base h-13 font-bold">
              <Link to="/dashboard/generate">Generate Photos Now <ArrowRight className="h-5 w-5 ml-2" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">PhotoAI</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">AI-powered product photography platform for modern ecommerce brands.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">Navigation</h4>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {FOOTER_LINKS.map((link) => (
                  <a key={link} href="#" className="text-sm text-slate-300 hover:text-white transition-colors">{link}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-slate-400">Stay Updated</h4>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-full bg-slate-800 border border-slate-700 px-4 py-2.5">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="email"
                    placeholder="Enter Email"
                    className="bg-transparent text-sm text-white placeholder:text-slate-500 outline-none flex-1"
                  />
                </div>
                <Button className="rounded-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 px-6 text-sm">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            © 2026 AI Product Photoshoot. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
