import { useState } from 'react';

export type KYCStatus =
  | 'not_started'
  | 'uploading'
  | 'ready_to_submit'
  | 'pending_review'
  | 'approved'
  | 'rejected';

export interface KYCDocument {
  type: 'pan' | 'aadhaar' | 'gst';
  fileName: string;
  fileSize: string;
  uploadedAt?: Date;
}

export interface UseKYCStatusReturn {
  status: KYCStatus;
  isLoading: boolean;
  documents: KYCDocument[];
  referenceId: string | null;
  uploadDocument: (doc: KYCDocument) => void;
  submitKYC: () => Promise<void>;
  refetch: () => void;
  goBack: () => void;
  setStatusToReadyToSubmit: () => void;
}

export function useKYCStatus(): UseKYCStatusReturn {
  const [status, setStatus] = useState<KYCStatus>('not_started');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const uploadDocument = (doc: KYCDocument) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.type !== doc.type);
      return [...filtered, doc];
    });

    // Check if all documents are uploaded
    const updatedDocs = documents.filter((d) => d.type !== doc.type).concat(doc);
    const hasAllDocs = ['pan', 'aadhaar', 'gst'].every((type) =>
      updatedDocs.some((d) => d.type === type),
    );

    if (hasAllDocs) {
      setStatus('ready_to_submit');
    } else {
      setStatus('uploading');
    }
  };

  const submitKYC = async () => {
    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate reference ID
    const refId = `#KYC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setReferenceId(refId);
    setStatus('pending_review');
    setIsLoading(false);
  };

  const refetch = () => {
    // Simulate refetching status from API
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const goBack = () => {
    setStatus('uploading');
  };

  const setStatusToReadyToSubmit = () => {
    setStatus('ready_to_submit');
  };

  return {
    status,
    isLoading,
    documents,
    referenceId,
    uploadDocument,
    submitKYC,
    refetch,
    goBack,
    setStatusToReadyToSubmit,
  };
}
