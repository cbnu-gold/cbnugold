const ease = [0.16, 1, 0.3, 1] as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease },
};

export const staggerContainer = {
  whileInView: { transition: { staggerChildren: 0.1 } },
  viewport: { once: true },
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease },
};

export const countUp = {
  initial: { opacity: 0, scale: 0.9 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true },
  transition: { duration: 0.8, ease },
};

export const heroText = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, delay: 0.2, ease },
};

export const revealFromBelow = {
  initial: { opacity: 0, clipPath: "inset(100% 0 0 0)" },
  whileInView: { opacity: 1, clipPath: "inset(0% 0 0 0)" },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 1.0, ease },
};

export const goldLineDraw = {
  initial: { scaleX: 0, transformOrigin: "left center" },
  whileInView: { scaleX: 1 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease },
};
