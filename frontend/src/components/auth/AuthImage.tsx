import { motion } from "framer-motion";
import authHero from "@/assets/auth-hero.jpg";

export function AuthImage() {
  return (
    <div className="relative hidden lg:flex h-full w-full items-center justify-center overflow-hidden bg-muted">
      <img
        src={authHero}
        alt="AI generated luxury skincare product photography"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Glass overlay card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="absolute bottom-8 left-8 right-8 max-w-xs rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-xl"
      >
        <p className="text-lg font-semibold text-white">Luxe Skincare Bottle</p>
        <p className="mt-0.5 text-sm text-white/70">Ecommerce Product</p>
        <p className="mt-2 text-xs text-white/50">Generated with AI Photoshoot</p>
      </motion.div>
    </div>
  );
}
