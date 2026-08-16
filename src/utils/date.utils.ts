/**
 * Formats a date string into a readable format: 'Jan 12, 10:23 AM'
 */
export const formatDate = (dateString: string | Date): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-US', options).replace(',', '');
};

/**
 * Gets the current computer date and time in the formatted string.
 */
export const getCurrentFormattedDateTime = (): string => {
  return formatDate(new Date());
};
