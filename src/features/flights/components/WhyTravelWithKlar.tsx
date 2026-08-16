import React from 'react';
import { 
  Shield, 
  Headphones, 
  Calendar, 
  Lock,
  Users,
  Globe,
  Star,
  Clock
} from 'lucide-react';

const features = [
    {
        title: 'Best Price Guarantee',
        description: 'Never overpay for your journey. We compare thousands of travel options to bring you the best available prices.',
        icon: Shield,
        iconColor: '#1a1f4d',
        bgColor: '#f1f5f9'
    },
    {
        title: '24/7 Expert Support',
        description: 'Travel confidently with dedicated assistance available anytime, anywhere around the world.',
        icon: Headphones,
        iconColor: '#1a1f4d',
        bgColor: '#f1f5f9'
    },
    {
        title: 'Flexible Booking',
        description: 'Plans change. Modify or cancel your bookings easily with flexible travel options.',
        icon: Calendar,
        iconColor: '#1a1f4d',
        bgColor: '#f1f5f9'
    },
    {
        title: 'Secure Payments',
        description: 'Enjoy worry-free transactions protected by advanced encryption and globally trusted payment gateways.',
        icon: Lock,
        iconColor: '#1a1f4d',
        bgColor: '#f1f5f9'
    },
];

const stats = [
    { number: '50K+', label: 'Happy Travelers', icon: Users, iconColor: '#1a1f4d' },
    { number: '120+', label: 'Countries Covered', icon: Globe, iconColor: '#1a1f4d' },
    { number: '4.9★', label: 'Average Rating', icon: Star, iconColor: '#1a1f4d' },
    { number: '24/7', label: 'Support', icon: Clock, iconColor: '#1a1f4d' },
];

export default function WhyTravelWithKlar() {
    return (
        <div className="w-full py-12 md:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 bg-transparent">
            <div className="max-w-7xl mx-auto">
                {/* Capsule Badge - Why Travel With Klar */}
                <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="h-px w-12 bg-primary/20"></div>
                    <div className="bg-primary/5 border border-primary/20 rounded-full px-6 py-1.5">
                        <p
                            className="text-primary/70 uppercase whitespace-nowrap"
                            style={{
                                fontFamily: "'Playfair Display', serif",
                                fontWeight: 600,
                                fontSize: "14px",
                                lineHeight: "20px",
                                letterSpacing: "0px",
                                textAlign: "center",
                                verticalAlign: "middle"
                            }}
                        >
                            Why Travel With Klar
                        </p>
                    </div>
                    <div className="h-px w-12 bg-primary/20"></div>
                </div>

                {/* Header Section */}
                <div className="text-center mb-10 md:mb-14">
                    <h2 className="font-display mb-3 text-2xl font-medium text-primary sm:text-3xl md:mb-4 md:text-4xl lg:text-5xl">
                        Premium travel experiences
                        <br />
                        backed by <span className="text-[var(--color-brand-red)]">trust</span>
                    </h2>
                    <p
                        className="text-gray-600 max-w-2xl mx-auto"
                        style={{
                            fontFamily: "'Playfair Display', serif",
                            fontWeight: 400,
                            fontSize: "20px",
                            lineHeight: "28px",
                            letterSpacing: "0px",
                            textAlign: "center",
                            verticalAlign: "middle"
                        }}
                    >
                        We're committed to making every journey simple, safe, and unforgettable.
                    </p>
                </div>

                {/* Features Grid - 4 columns on large screens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12 md:mb-16">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <div
                                key={index}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 transition-all duration-300 border hover:border-primary/20 hover:shadow-xl group flex flex-col items-center text-center"
                                style={{
                                    borderColor: '#D1D5DB'
                                }}
                            >
                                {/* Icon Section - Centered */}
                                <div 
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                                    style={{ 
                                        backgroundColor: feature.bgColor,
                                        color: feature.iconColor
                                    }}
                                >
                                    <Icon size={28} strokeWidth={1.5} />
                                </div>
                                
                                {/* Reduced text sizes inside cards only */}
                                <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-800 mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-xs sm:text-sm md:text-sm text-gray-600 leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
                
                {/* Stats Section - With icons on the left */}
                <div className="rounded-2xl p-6 md:p-8 shadow-lg border border-white/30 max-w-6xl mx-auto" style={{ background: '#1A1F4D0D' }}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                        {stats.map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={index}
                                    className="relative flex items-center gap-3 md:gap-4"
                                >
                                    {/* Icon on the left */}
                                    <div 
                                        className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{ 
                                            backgroundColor: `${stat.iconColor}15`,
                                            color: stat.iconColor
                                        }}
                                    >
                                        <Icon size={20} strokeWidth={1.5} />
                                    </div>
                                    
                                    {/* Text content on the right */}
                                    <div className="flex flex-col">
                                        <div className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold" style={{ color: '#1F2357' }}>
                                            {stat.number}
                                        </div>
                                        <div className="text-gray-600 text-xs sm:text-sm md:text-sm">
                                            {stat.label}
                                        </div>
                                    </div>
                                    
                                    {/* Divider */}
                                    {index < stats.length - 1 && (
                                        <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 w-px h-12 bg-gray-300"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}