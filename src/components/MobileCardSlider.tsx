import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobileCardSliderProps {
  children: React.ReactNode[];
  cardsPerPage?: number;
}

export function MobileCardSlider({ children, cardsPerPage = 4 }: MobileCardSliderProps) {
  const totalPages = Math.ceil(children.length / cardsPerPage);
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const goTo = (newPage: number, dir: number) => {
    setDirection(dir);
    setPage(newPage);
  };

  const next = () => page < totalPages - 1 && goTo(page + 1, 1);
  const prev = () => page > 0 && goTo(page - 1, -1);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      diff > 0 ? next() : prev();
    }
  };

  const currentCards = children.slice(page * cardsPerPage, (page + 1) * cardsPerPage);

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 200 : -200, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -200 : 200, opacity: 0 }),
  };

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="grid grid-cols-2 gap-2"
          >
            {currentCards}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + arrows */}
      <div className="flex items-center justify-center gap-3 mt-3">
        <button
          onClick={prev}
          disabled={page === 0}
          className="p-1 rounded-full text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex gap-1.5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i, i > page ? 1 : -1)}
              className={`h-1.5 rounded-full transition-all ${
                i === page ? "w-4 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={page === totalPages - 1}
          className="p-1 rounded-full text-muted-foreground disabled:opacity-20 hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
