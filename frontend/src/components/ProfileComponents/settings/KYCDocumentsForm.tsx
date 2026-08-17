import React, { useRef, useState } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle2, Eye, Download, Trash2 } from 'lucide-react';
import type { KYCDocument } from '../ProfileSections/useKYCStatus';
import { notifyError } from '@/utils/notify';

interface UploadedFile {
  file: File;
  name: string;
  size: string;
  uploadedAt: string;
}

interface KYCDocumentsFormProps {
  uploadDocument: (doc: KYCDocument) => void;
  setStatusToReadyToSubmit: () => void;
}

const KYCDocumentsForm: React.FC<KYCDocumentsFormProps> = ({
  uploadDocument,
  setStatusToReadyToSubmit,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<{
    pan?: UploadedFile;
    aadhaar?: UploadedFile;
    gst?: UploadedFile;
  }>({});

  const panInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);
  const gstInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getCurrentTime = (): string => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const handleFileSelect = (
    type: 'pan' | 'aadhaar' | 'gst',
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      notifyError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      notifyError('Please upload a valid file (JPG, PNG, or PDF)');
      return;
    }

    const uploadedFile: UploadedFile = {
      file,
      name: file.name,
      size: formatFileSize(file.size),
      uploadedAt: getCurrentTime(),
    };

    setUploadedFiles((prev) => ({ ...prev, [type]: uploadedFile }));

    // Update the KYC status hook
    uploadDocument({
      type,
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      uploadedAt: new Date(),
    });
  };

  const handleRemoveFile = (type: 'pan' | 'aadhaar' | 'gst') => {
    setUploadedFiles((prev) => {
      const updated = { ...prev };
      delete updated[type];
      return updated;
    });
  };

  const handleUploadClick = (type: 'pan' | 'aadhaar' | 'gst') => {
    if (type === 'pan') panInputRef.current?.click();
    if (type === 'aadhaar') aadhaarInputRef.current?.click();
    if (type === 'gst') gstInputRef.current?.click();
  };

  const handleClearAll = () => {
    setUploadedFiles({});
  };

  const allDocumentsUploaded = uploadedFiles.pan && uploadedFiles.aadhaar && uploadedFiles.gst;

  const renderDocumentCard = (
    type: 'pan' | 'aadhaar' | 'gst',
    title: string,
    uploadedFile?: UploadedFile,
    inputRef?: React.RefObject<HTMLInputElement>,
  ) => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">PDF or JPG, max 5MB</p>
          </div>
        </div>
        {uploadedFile && (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-600">Verified</span>
          </div>
        )}
      </div>

      {/* Uploaded Document Display */}
      {uploadedFile && (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
            <div className="flex items-center gap-4">
              {/* Thumbnail */}
              <div className="w-14 h-14 bg-white border border-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                <FileText size={24} className="text-gray-400" />
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-gray-900 truncate">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{uploadedFile.size}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 size={12} className="text-green-600" />
                  <span className="text-xs text-green-600">Uploaded {uploadedFile.uploadedAt}</span>
                </div>
              </div>

              {/* Action Icons */}
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded transition-colors" title="View">
                  <Eye size={18} className="text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                  title="Download"
                >
                  <Download size={18} className="text-gray-600" />
                </button>
                <button
                  onClick={() => handleRemoveFile(type)}
                  className="p-2 hover:bg-red-50 rounded transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} className="text-red-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Replace Document Button */}
          <button
            onClick={() => handleUploadClick(type)}
            className="w-full text-center text-sm font-medium text-red-500 hover:text-red-600 py-2 transition-colors"
          >
            Replace Document
          </button>
        </>
      )}

      {/* Upload Button (when no file) */}
      {!uploadedFile && (
        <button
          onClick={() => handleUploadClick(type)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
        >
          <Upload size={18} className="text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Upload Document</span>
        </button>
      )}

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => handleFileSelect(type, e)}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="max-w-4xl">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">KYC Documents</h1>

      {/* Alert Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-amber-800">KYC Verification Pending</h4>
            <p className="text-sm text-amber-700 mt-0.5">
              Please upload valid documents to enable full wallet features.
            </p>
          </div>
        </div>
      </div>

      {/* Document Cards */}
      {renderDocumentCard('pan', 'PAN Card', uploadedFiles.pan, panInputRef)}
      {renderDocumentCard(
        'aadhaar',
        'Aadhaar Card (Front & Back)',
        uploadedFiles.aadhaar,
        aadhaarInputRef,
      )}
      {renderDocumentCard('gst', 'GST Certificate', uploadedFiles.gst, gstInputRef)}

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
        <button
          onClick={handleClearAll}
          className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
        >
          Clear All
        </button>
        <button
          disabled={!allDocumentsUploaded}
          onClick={() => allDocumentsUploaded && setStatusToReadyToSubmit()}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all ${
            allDocumentsUploaded
              ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Upload size={18} />
          Submit for Verification
        </button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center justify-end gap-3 mt-4">
        <button className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
          Cancel
        </button>
        <button className="px-6 py-2.5 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm">
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default KYCDocumentsForm;
