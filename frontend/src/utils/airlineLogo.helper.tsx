export const getAirlineIcon = (airline: any) => {
  const airlineCode = typeof airline === 'object' ? airline.code : airline;

  return (
    <img
      src={`https://daisycon.io/images/airline/?width=300&height=150&iata=${airlineCode}`}
      alt={airlineCode || 'airline'}
      className="w-8 h-8 object-contain"
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
};
