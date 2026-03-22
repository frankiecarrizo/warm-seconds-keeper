import { useEffect, useState } from "react";

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDeg = hours * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  const markers = Array.from({ length: 60 }, (_, i) => {
    const isHour = i % 5 === 0;
    const angle = (i * 6 * Math.PI) / 180;
    const outerR = 46;
    const innerR = isHour ? 40 : 43;
    return (
      <line
        key={i}
        x1={50 + innerR * Math.sin(angle)}
        y1={50 - innerR * Math.cos(angle)}
        x2={50 + outerR * Math.sin(angle)}
        y2={50 - outerR * Math.cos(angle)}
        className="stroke-foreground"
        strokeWidth={isHour ? 1.5 : 0.5}
        strokeLinecap="round"
      />
    );
  });

  const numerals = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n, i) => {
    const angle = (i * 30 * Math.PI) / 180;
    const r = 35;
    return (
      <text
        key={n}
        x={50 + r * Math.sin(angle)}
        y={50 - r * Math.cos(angle)}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground"
        style={{ fontSize: "4.5px", fontFamily: "inherit", fontWeight: 500 }}
      >
        {n}
      </text>
    );
  });

  const formattedTime = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = time.toLocaleDateString([], {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      <svg viewBox="0 0 100 100" className="w-72 h-72 sm:w-96 sm:h-96 drop-shadow-xl">
        {/* Face */}
        <circle cx="50" cy="50" r="48" className="fill-card" />
        <circle cx="50" cy="50" r="48" className="fill-none stroke-border" strokeWidth="0.5" />

        {markers}
        {numerals}

        {/* Hour hand */}
        <line
          x1="50" y1="50" x2="50" y2="24"
          className="stroke-foreground"
          strokeWidth="2.2"
          strokeLinecap="round"
          transform={`rotate(${hourDeg} 50 50)`}
          style={{ transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }}
        />

        {/* Minute hand */}
        <line
          x1="50" y1="50" x2="50" y2="14"
          className="stroke-foreground"
          strokeWidth="1.4"
          strokeLinecap="round"
          transform={`rotate(${minuteDeg} 50 50)`}
          style={{ transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)" }}
        />

        {/* Second hand */}
        <line
          x1="50" y1="56" x2="50" y2="12"
          className="stroke-accent"
          strokeWidth="0.6"
          strokeLinecap="round"
          transform={`rotate(${secondDeg} 50 50)`}
        />

        {/* Center dot */}
        <circle cx="50" cy="50" r="1.8" className="fill-accent" />
        <circle cx="50" cy="50" r="0.8" className="fill-card" />
      </svg>

      <div className="text-center space-y-1">
        <p className="text-3xl sm:text-4xl font-light tracking-widest text-foreground tabular-nums">
          {formattedTime}
        </p>
        <p className="text-sm text-muted-foreground tracking-wide">
          {formattedDate}
        </p>
      </div>
    </div>
  );
};

export default Clock;
