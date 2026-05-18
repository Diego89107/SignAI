import React from "react";
import { motion } from "framer-motion";
import AnimatedBackground from "./AnimatedBackground";

export default function PageLayout({ children, className = "", contentClassName = "" }) {
  return (
    <div className={`isolate flex-1 flex flex-col w-full ${className}`}>
      <AnimatedBackground />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`flex-1 flex flex-col w-full ${contentClassName}`}
      >
        {children}
      </motion.div>
    </div>
  );
}
