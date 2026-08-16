import React, { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
      `}</style>

      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
        <div className="w-48 h-48 md:w-56 md:h-56">
          <DotLottieReact
            src="/loader.lottie"
            loop
            autoplay
          />
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
