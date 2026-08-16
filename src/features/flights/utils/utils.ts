export const parseLocation = (locationString: string) => {
  const match = locationString.match(/^(.+?)\s*\(([A-Z]+)\),\s*(.+)$/);
  if (match) {
    return {
      city: match[1]?.trim(),
      code: match[2]?.trim(),
      country: match[3]?.trim(),
    };
  }

  if (/^[A-Z]{3}$/.test(locationString.trim())) {
    return {
      city: locationString.trim(),
      code: locationString.trim(),
      country: '',
    };
  }
  return {
    city: locationString || 'Unknown',
    code: 'XXX',
    country: '',
  };
};

export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return 'Select Date';
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
};
