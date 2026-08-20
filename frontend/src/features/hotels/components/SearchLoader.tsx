import { useEffect, useState } from "react";

interface SearchLoaderProps {
  location?: string;
  checkIn?: string;
  checkOut?: string;
}

const messages = [
  "Searching 250+ hotels...",
  "Comparing room prices...",
  "Checking room availability...",
  "Finding the best offers...",
  "Almost there...",
];

/**
 * The animation is CSS rather than a Lottie file. It replaced
 * @lottiefiles/dotlottie-react — a full animation runtime plus a 32KB asset,
 * both loaded on every search, to spin a graphic for a few seconds. The
 * keyframes below cost nothing to ship and start painting immediately, with no
 * runtime to initialise and no asset that can 404.
 *
 * `prefers-reduced-motion` stops the orbit and the pulse; the message rotation
 * below is a text change rather than motion, so it is left alone.
 */
export default function HotelSearchLoader({ location }: SearchLoaderProps = {}) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2200);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes dots {
          0% { content: ""; }
          25% { content: "."; }
          50% { content: ".."; }
          75% { content: "..."; }
          100% { content: ""; }
        }
        .dots::after {
          content: "";
          animation: dots 1.5s infinite;
        }

        @keyframes klar-orbit { to { transform: rotate(360deg); } }
        @keyframes klar-pulse {
          0%, 100% { transform: scale(1);    opacity: 1; }
          50%      { transform: scale(0.82); opacity: 0.55; }
        }

        .klar-loader { position: relative; width: 100%; height: 100%; }
        /* Two counter-rotating arcs: one ring reads as a spinner at any size. */
        .klar-loader__ring {
          position: absolute; inset: 0;
          border-radius: 9999px;
          border: 3px solid transparent;
          border-top-color: #008cff;
          animation: klar-orbit 1.1s linear infinite;
        }
        .klar-loader__ring--inner {
          inset: 18%;
          border-top-color: transparent;
          border-bottom-color: #99d4ff;
          animation-duration: 1.6s;
          animation-direction: reverse;
        }
        .klar-loader__core {
          position: absolute; inset: 38%;
          border-radius: 9999px;
          background: #008cff;
          animation: klar-pulse 1.4s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .klar-loader__ring, .klar-loader__core { animation: none; }
          .klar-loader__ring--inner { border-bottom-color: #99d4ff; }
        }
      `}</style>

      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
        <div
          className="w-48 h-48 md:w-56 md:h-56"
          role="status"
          aria-live="polite"
          aria-label={
            location ? `Searching hotels in ${location}` : "Searching hotels"
          }
        >
          <div className="klar-loader">
            <div className="klar-loader__ring" />
            <div className="klar-loader__ring klar-loader__ring--inner" />
            <div className="klar-loader__core" />
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-800 flex items-center gap-1">
          Searching Hotels
          <span className="dots w-8"></span>
        </h2>
        <p className="mt-2 text-md text-gray-500 transition-all duration-500 h-6">
          {messages[messageIndex]}
        </p>
      </div>
    </>
  );
}
