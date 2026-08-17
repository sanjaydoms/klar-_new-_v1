type LoaderSize = 'small' | 'medium' | 'large';

interface FlightFlyingLoaderProps {
    size?: LoaderSize;
}

const FlightFlyingLoader = ({ size = 'medium' }: FlightFlyingLoaderProps) => {
    const sizeClasses: Record<LoaderSize, string> = {
        small: 'w-20 h-20',
        medium: 'w-32 h-32',
        large: 'w-48 h-48'
    };

    return (
        <div className="flex flex-col items-center justify-center py-10">
            <div className={`relative ${sizeClasses[size]} overflow-visible`}>
                {/* Cloud 1 - Large - Starts from right outside */}
                <div className="absolute top-0 animate-cloud-fast" style={{ left: '120%' }}>
                    <svg className="w-14 h-14 text-gray-300/70 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 2 - Medium */}
                <div className="absolute top-1/3 animate-cloud-fast" style={{ left: '140%', animationDelay: '1s' }}>
                    <svg className="w-10 h-10 text-gray-300/60 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 3 - Extra Large */}
                <div className="absolute bottom-0 animate-cloud-fast" style={{ left: '160%', animationDelay: '0.5s' }}>
                    <svg className="w-16 h-16 text-gray-300/50 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 4 - Small */}
                <div className="absolute top-1/4 animate-cloud-fast" style={{ left: '180%', animationDelay: '1.5s' }}>
                    <svg className="w-8 h-8 text-gray-300/55 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 5 - Medium-Large */}
                <div className="absolute bottom-1/4 animate-cloud-fast" style={{ left: '200%', animationDelay: '2s' }}>
                    <svg className="w-12 h-12 text-gray-300/45 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 6 - Large */}
                <div className="absolute top-0 animate-cloud-fast" style={{ left: '220%', animationDelay: '2.5s' }}>
                    <svg className="w-14 h-14 text-gray-300/40 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Cloud 7 - Small */}
                <div className="absolute bottom-0 animate-cloud-fast" style={{ left: '250%', animationDelay: '3s' }}>
                    <svg className="w-8 h-8 text-gray-300/35 fill-current" viewBox="0 0 24 24">
                        <path d="M6.5 18C4.5 18 3 16.5 3 14.5C3 12.5 4.5 11 6.5 11C6.8 11 7.1 11.1 7.4 11.2C8.1 9.3 9.9 8 12 8C14.2 8 16 9.8 16 12C16 12.1 16 12.2 16 12.3C16.8 12.1 17.6 12 18.5 12C20.4 12 22 13.6 22 15.5C22 17.4 20.4 19 18.5 19H6.5Z"/>
                    </svg>
                </div>

                {/* Airplane - Static in center with float effect */}
                <div className="absolute inset-0 flex items-center justify-center animate-float-plane z-10">
                    <img 
                        src="/logo/airplane.png" 
                        alt="Airplane"
                        className="w-3/5 h-3/5 object-contain drop-shadow-2xl"
                    />
                </div>

                {/* Wind/Speed Lines - Moving faster */}
                <div className="absolute inset-0 overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute h-0.5 bg-gradient-to-r from-gray-400/0 via-gray-400/30 to-gray-400/0 rounded-full animate-wind-fast"
                            style={{
                                top: `${5 + i * 12}%`,
                                width: `${15 + i * 8}%`,
                                animationDelay: `${i * 0.2}s`,
                                left: '100%'
                            }}
                        />
                    ))}
                </div>

                {/* Small particles moving faster */}
                {[...Array(15)].map((_, i) => (
                    <div
                        key={`particle-${i}`}
                        className="absolute w-1 h-1 bg-gray-400/30 rounded-full animate-particle-fast"
                        style={{
                            top: `${5 + Math.random() * 90}%`,
                            left: `${80 + Math.random() * 30}%`,
                            animationDelay: `${i * 0.15}s`,
                        }}
                    />
                ))}
            </div>

            {/* Loading Text */}
            <div className="mt-8">
                <p className="text-gray-500 text-sm font-medium tracking-wider animate-pulse-text">
                    Searching for flights...
                </p>
            </div>
        </div>
    );
};

// Add to your global styles
export const LoaderStyles = () => (
    <style>{`
        @keyframes cloud-fast {
            0% {
                transform: translateX(0) scale(1);
                opacity: 0;
            }
            5% {
                opacity: 0.8;
            }
            85% {
                opacity: 0.8;
            }
            100% {
                transform: translateX(-350%) scale(0.9);
                opacity: 0;
            }
        }

        @keyframes float-plane {
            0%, 100% {
                transform: translateY(0) scale(1);
            }
            50% {
                transform: translateY(-6px) scale(1.03);
            }
        }

        @keyframes wind-fast {
            0% {
                transform: translateX(0) scaleX(0.3);
                opacity: 0;
            }
            10% {
                opacity: 0.7;
            }
            90% {
                opacity: 0.7;
            }
            100% {
                transform: translateX(-400%) scaleX(1.5);
                opacity: 0;
            }
        }

        @keyframes particle-fast {
            0% {
                transform: translateX(0) scale(0);
                opacity: 0;
            }
            10% {
                opacity: 0.6;
            }
            90% {
                opacity: 0.6;
            }
            100% {
                transform: translateX(-600%) scale(2);
                opacity: 0;
            }
        }

        @keyframes pulse-text {
            0%, 100% {
                opacity: 0.6;
            }
            50% {
                opacity: 1;
            }
        }

        .animate-cloud-fast {
            animation: cloud-fast 4s ease-in-out infinite;
        }

        .animate-float-plane {
            animation: float-plane 2s ease-in-out infinite;
        }

        .animate-wind-fast {
            animation: wind-fast 1.5s ease-in-out infinite;
        }

        .animate-particle-fast {
            animation: particle-fast 1.8s ease-in-out infinite;
        }

        .animate-pulse-text {
            animation: pulse-text 2s ease-in-out infinite;
        }
    `}</style>
);

export default FlightFlyingLoader;