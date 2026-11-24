import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

/** Sections stack: each new section rises from below over the previous one, which shrinks and blurs. */
export function StackSections({ sections }: { sections: { id: string; title: string; eyebrow?: string; content: ReactNode }[] }) {
  return <div className="relative">{sections.map((s, i) => <Section key={s.id} index={i} {...s} />)}</div>;
}

function Section({ id, title, eyebrow, content, index }: { id: string; title: string; eyebrow?: string; content: ReactNode; index: number }) {
  const ref = useRef<HTMLElement>(null);
  // progress while THIS section scrolls away under the next one
  const { scrollYProgress } = useScroll({ target: ref, offset: ["end end", "end start"] });
  return (
    <section ref={ref} id={id} className="relative md:sticky md:top-20" style={{ zIndex: index + 1 }}>
      <Covered progress={scrollYProgress}>
        <motion.div initial={{ y: 80, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true, amount: 0.15 }}
          transition={{ type: "spring", stiffness: 90, damping: 20 }}
          className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card-hover)] md:mb-10 md:p-8">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">{eyebrow}</p>}
          <h2 className="mb-5 text-2xl text-church-blue md:text-3xl">{title}</h2>
          {content}
        </motion.div>
      </Covered>
    </section>
  );
}

function Covered({ progress, children }: { progress: MotionValue<number>; children: ReactNode }) {
  const scale = useTransform(progress, [0, 1], [1, 0.92]);
  const blur = useTransform(progress, [0, 1], ["blur(0px)", "blur(8px)"]);
  const opacity = useTransform(progress, [0, 1], [1, 0.4]);
  return <motion.div style={{ scale, filter: blur, opacity, transformOrigin: "top center" }}>{children}</motion.div>;
}
