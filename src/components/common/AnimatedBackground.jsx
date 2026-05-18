import React from "react";
import { motion } from "framer-motion";

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 via-indigo-50 to-sky-100 dark:from-[#0a0f1f] dark:via-[#101936] dark:to-[#0d2042] transition-colors duration-700" />

      <motion.div
        className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-indigo-400/40 dark:bg-indigo-500/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-indigo-500/30 dark:bg-indigo-400/20 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 w-[24rem] h-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300/30 dark:bg-sky-500/15 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
