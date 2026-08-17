import { FlightOption, FlightSegment } from '../../types/types.multiCityFlight';

interface SegmentTabsProps {
  segments: FlightSegment[];
  currentSegment: number;
  setCurrentSegment: (index: number) => void;
  selectedFlights: Map<number, FlightOption>;
  sortBy?: string;
  setSortBy?: (sort: string) => void;
}

export default function SegmentTabs({
  segments,
  currentSegment,
  setCurrentSegment,
  selectedFlights,
  sortBy,
  setSortBy,
}: SegmentTabsProps) {
  const getSegmentDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <div className="bg-white mb-6">
      {/* Segment Tabs */}
      <div className="flex items-stretch gap-3 mb-4">
        {segments.map((segment, index) => {
          const isActive = currentSegment === index;
          const isCompleted = selectedFlights.has(index);

          return (
            <button
              key={index}
              onClick={() => setCurrentSegment(index)}
              className={`flex-1 px-6 py-4 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-white border-2 border-gray-300 shadow-sm'
                  : isCompleted
                    ? 'bg-gray-50 border-2 border-gray-200'
                    : 'bg-gray-50 border-2 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-gray-900 text-base">
                  {segment.from} To {segment.to}
                </div>
                {isCompleted && (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="text-sm text-gray-500">{getSegmentDate(segment.date)}</div>
            </button>
          );
        })}
      </div>

      {/* Sort Options */}
      {setSortBy && (
        <div className="flex gap-3">
          <button
            onClick={() => setSortBy('cheapest')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              sortBy === 'cheapest'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="text-center">
              <div className={sortBy === 'cheapest' ? 'text-white' : 'text-gray-900'}>Cheapest</div>
              {sortBy === 'cheapest' && <div className="text-xs mt-0.5 opacity-90">₹7,150</div>}
            </div>
          </button>

          <button
            onClick={() => setSortBy('fastest')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              sortBy === 'fastest'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="text-center">
              <div className={sortBy === 'fastest' ? 'text-white' : 'text-gray-900'}>Fastest</div>
              {sortBy === 'fastest' && <div className="text-xs mt-0.5 opacity-90">02h 45m</div>}
            </div>
          </button>

          <button
            onClick={() => setSortBy('best')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
              sortBy === 'best'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <div className="text-center">
              <div className={sortBy === 'best' ? 'text-white' : 'text-gray-900'}>Best</div>
              {sortBy === 'best' && <div className="text-xs mt-0.5 opacity-90">Recommended</div>}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
