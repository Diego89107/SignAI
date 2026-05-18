import React from "react";
import { motion } from "framer-motion";

export default function NavCard({
  title,
  img,
  imgAlt,
  onClick,
  tutorialKey,
  className = "",
}) {
  return (
    <motion.div
      data-tutorial={tutorialKey}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`cursor-pointer bg-white dark:bg-[#151822] rounded-2xl 2xl:rounded-3xl
                  shadow-lg hover:shadow-indigo-400/20
                  p-4 sm:p-5 lg:p-6 2xl:p-8
                  w-44 h-44 sm:w-52 sm:h-52 lg:w-56 lg:h-56 2xl:w-72 2xl:h-72
                  flex flex-col items-center justify-center
                  transition-all duration-500 ease-in-out mx-auto
                  border border-transparent hover:border-indigo-500/30 ${className}`}
    >
      <img
        src={img}
        alt={imgAlt ?? title}
        className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 2xl:w-32 2xl:h-32 object-contain mb-2 sm:mb-3 lg:mb-4 2xl:mb-5 drop-shadow-md"
      />
      <h3 className="text-sm sm:text-base lg:text-lg 2xl:text-2xl font-semibold text-center">
        {title}
      </h3>
    </motion.div>
  );
}
