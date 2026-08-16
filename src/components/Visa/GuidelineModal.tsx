import React, { useState, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, Cloud, ChevronLeft } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface GuidelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'passport-front' | 'passport-back' | 'photo' | null;
  onUpload: (file: File) => void;
}

const GuidelineModal: React.FC<GuidelineModalProps> = ({ isOpen, onClose, type, onUpload }) => {
  const [view, setView] = useState<'guidelines' | 'options'>('guidelines');
  const [showCamera, setShowCamera] = useState(false);

  // Reset view when modal opens
  useEffect(() => {
    if (isOpen) {
      setView('guidelines');
      setShowCamera(false);
    }
  }, [isOpen]);

  if (!isOpen || !type) return null;

  const content = {
    'passport-front': {
      title: 'Guidelines for Passport Front upload',
      sampleTitle: 'Sample Passport Front Image',
      sampleDesc: 'Image can be jpg, jpeg, pdf, png formats',
      guidelinesTitle: 'Important Guidelines for Passport Front',
      guidelines: [
        'Upload colored passport copy of first page',
        'Ensure all details (Name, DOB, Passport No) are visible',
        'No glare or reflections on the photo',
      ],
      sampleImageSrc:
        'C:/Users/manis/.gemini/antigravity/brain/358ae378-e28c-4c02-b831-bc44de264937/passport_front_sample_1770106089539.png',
    },
    'passport-back': {
      title: 'Guidelines for Passport Back upload',
      sampleTitle: 'Sample Passport Back Image',
      sampleDesc: 'Image can be jpg, jpeg, pdf, png formats',
      guidelinesTitle: 'Important Guidelines for Passport Back',
      guidelines: [
        'Upload colored passport copy of last page',
        'Ensure address details are clearly visible',
        'Full page should be captured',
      ],
      sampleImageSrc:
        'C:/Users/manis/.gemini/antigravity/brain/358ae378-e28c-4c02-b831-bc44de264937/passport_back_sample_1770106107692.png',
    },
    photo: {
      title: 'Guidelines for Photograph upload',
      sampleTitle: 'Sample Photograph Image',
      sampleDesc: 'Image can be jpg, jpeg, png formats',
      guidelinesTitle: 'Important Guidelines for Photograph',
      guidelines: [
        'Background: White with no patterns or shadow',
        'Photo should not be blur',
        'Photo should not cut from head or chin',
        'Eyes should be open',
      ],
      sampleImageSrc:
        'C:/Users/manis/.gemini/antigravity/brain/358ae378-e28c-4c02-b831-bc44de264937/passport_photo_sample_1770106069855.png',
    },
  };

  const data = content[type];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onUpload(file);
      setView('guidelines'); // Reset for next time
    }
  };

  const triggerFileInput = (mode: 'camera' | 'gallery' | 'drive') => {
    const input = document.getElementById('hidden-file-input') as HTMLInputElement;
    if (input) {
      // Reset input value to ensure change event fires even if same file selected
      input.value = '';

      if (mode === 'camera') {
        // For camera capture on mobile devices
        // Using 'user' for front camera or 'environment' for rear camera
        input.setAttribute('accept', 'image/*');
        // Set capture attribute - on mobile this forces camera to open
        input.setAttribute('capture', 'camera');
      } else {
        // For gallery/file selection - remove capture to allow file picking
        input.removeAttribute('capture');
        if (mode === 'gallery') {
          input.setAttribute('accept', 'image/*');
        } else {
          // For drive/documents - use specific extensions to trigger system file picker
          // This creates a broader intent that usually defaults to "Files" app instead of "Gallery"
          input.setAttribute('accept', '.pdf,.jpg,.jpeg,.png,application/pdf,image/*');
        }
      }

      input.click();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 relative overflow-hidden animate-scale-in"
          onClick={(e) => e.stopPropagation()} // Prevent close on modal click
        >
          {/* Hidden File Input */}
          <input
            type="file"
            id="hidden-file-input"
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,application/pdf"
          />

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {view === 'options' && (
                <button
                  onClick={() => setView('guidelines')}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 mr-1"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <h3 className="text-lg font-bold text-[#101828]">
                {view === 'options' ? 'Select Upload Method' : data.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[80vh]">
            {view === 'guidelines' ? (
              <>
                {/* Sample Section */}
                <div className="mb-6">
                  <h4 className="font-semibold text-[#101828] mb-1">{data.sampleTitle}</h4>
                  <p className="text-gray-500 text-xs mb-4">{data.sampleDesc}</p>

                  <div className="w-full bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 flex items-center justify-center">
                    <img
                      src={data.sampleImageSrc}
                      alt={data.sampleTitle}
                      className="max-w-full max-h-[300px] object-contain rounded shadow-sm"
                    />
                  </div>
                </div>

                {/* Guidelines Section */}
                <div>
                  <h4 className="font-semibold text-[#101828] mb-3">{data.guidelinesTitle}</h4>
                  <p className="text-gray-500 text-xs mb-3">
                    Please read the guidelines carefully before selecting your documents
                  </p>

                  <ul className="space-y-2">
                    {data.guidelines.map((guide, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-[#344054]">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#344054] shrink-0" />
                        {guide}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              /* Options View */
              <div className="grid grid-cols-1 gap-4 py-4">
                <UploadOption
                  icon={<Camera size={28} className="text-[#1F2A6B]" />}
                  title="Take Photo"
                  description="Use your camera to capture the document"
                  onClick={() => {
                    setShowCamera(true);
                  }}
                />
                <UploadOption
                  icon={<ImageIcon size={28} className="text-[#1F2A6B]" />}
                  title="Gallery"
                  description="Select an image from your device gallery"
                  onClick={() => triggerFileInput('gallery')}
                />
                <UploadOption
                  icon={<Cloud size={28} className="text-[#1F2A6B]" />}
                  title="Drive"
                  description="Import document from Google Drive / Files"
                  onClick={() => triggerFileInput('drive')}
                />
              </div>
            )}
          </div>

          {/* Footer Action */}
          {view === 'guidelines' && (
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setView('options')}
                className="w-full bg-[#1F2A6B] hover:bg-[#162055] text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2"
              >
                Upload Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Camera Capture Component */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={(file) => {
          onUpload(file);
          setShowCamera(false);
          setView('guidelines'); // Reset view
        }}
        documentType={type || 'document'}
      />
    </>
  );
};

const UploadOption = ({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-[#1F2A6B] hover:bg-blue-50/30 transition-all text-left group shadow-sm hover:shadow-md"
  >
    <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-sm transition-colors">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-[#101828] text-sm mb-1 group-hover:text-[#1F2A6B] transition-colors">
        {title}
      </h4>
      <p className="text-gray-500 text-xs">{description}</p>
    </div>
  </button>
);

export default GuidelineModal;
