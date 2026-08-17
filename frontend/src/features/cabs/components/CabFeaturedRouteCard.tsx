import React from 'react';

interface CabFeaturedRouteCardProps {
  route: any; // FeaturedRoute
  onClick: (route: any) => void;
}

export const CabFeaturedRouteCard: React.FC<CabFeaturedRouteCardProps> = ({ route, onClick }) => {
  return (
    <div
      className="cab-featured-route-card relative rounded overflow-hidden cursor-pointer group shadow hover:shadow-lg transition-shadow"
      onClick={() => onClick(route)}
    >
      <img
        src={route.image || 'https://via.placeholder.com/400x250'}
        alt={route.city}
        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
        <span className="text-white text-xs font-semibold uppercase tracking-wider mb-1">
          {route.country}
        </span>
        <h3 className="text-white font-bold text-lg leading-tight mb-1">{route.city}</h3>
        <p className="text-gray-300 text-sm">
          {route.from} &rarr; {route.to}
        </p>
      </div>
    </div>
  );
};
