import { Button } from '@/components/ui/button';

interface ActionButtonsProps {
  onCancel: () => void;
  onContinue: () => void;
  isLoading?: boolean;
}

export default function ActionButtons({
  onCancel,
  onContinue,
  isLoading = false,
}: ActionButtonsProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex flex-col gap-3">
          <Button onClick={onContinue} disabled={isLoading} className="h-11 w-full font-semibold">
            {isLoading ? 'Processing...' : 'Continue'}
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="h-11 w-full font-semibold"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
