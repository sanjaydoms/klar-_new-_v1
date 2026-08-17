import React from 'react';

interface Step {
  id: number;
  name: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
}

export default function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="border-b border-border bg-card py-4 sm:py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between sm:justify-start overflow-x-auto pb-2 sm:pb-0">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center min-w-[60px] sm:min-w-0">
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold ${
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id === currentStep
                        ? 'border border-accent bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? '✓' : step.id}
                </div>
                <span
                  className={`text-[10px] sm:text-xs mt-1 sm:mt-2 text-center max-w-[80px] sm:max-w-[100px] ${
                    step.id === currentStep ? 'font-semibold text-primary' : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 sm:mx-4 mb-3 sm:mb-5 ${
                    step.id < currentStep ? 'bg-accent' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
