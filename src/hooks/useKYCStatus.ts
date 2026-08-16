import { useState } from 'react';

export type KYCStatus =
  | 'not_started'
  | 'uploading'
  | 'ready_to_submit'
  | 'pending_review'
  | 'approved'
  | 'rejected';
export type DocumentVerificationStatus = 'idle' | 'verifying' | 'verified' | 'rejected';

export interface KYCDocument {
  type: 'pan' | 'aadhaar' | 'gst';
  fileName: string;
  fileSize: string;
  uploadedAt?: Date;
  verificationStatus?: DocumentVerificationStatus;
  qualityScore?: number;
  rejectionReason?: string;
  extractedData?: {
    idNumber?: string;
    fullName?: string;
    dob?: string;
    gender?: string;
    address?: string;
    structureMatch?: boolean;
  };
}

export interface UseKYCStatusReturn {
  status: KYCStatus;
  isLoading: boolean;
  documents: KYCDocument[];
  referenceId: string | null;
  uploadDocument: (doc: KYCDocument) => Promise<void>;
  submitKYC: () => Promise<void>;
  refetch: () => void;
  goBack: () => void;
  setStatusToReadyToSubmit: () => void;
  removeDocument: (type: 'pan' | 'aadhaar' | 'gst') => void;
}

export function useKYCStatus(): UseKYCStatusReturn {
  const [status, setStatus] = useState<KYCStatus>('not_started');
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  const verifyDocument = async (doc: KYCDocument): Promise<KYCDocument> => {
    // Simulate "AI Scanning & Reading" delay
    await new Promise((resolve) => setTimeout(resolve, 3500));

    const fileName = doc.fileName.toLowerCase();

    // Mock structural check: reject if obvious non-document
    if (fileName.includes('selfie') || (fileName.includes('photo') && !fileName.includes('card'))) {
      return {
        ...doc,
        verificationStatus: 'rejected',
        qualityScore: 20,
        rejectionReason:
          'The uploaded image does not appear to be an ID card. Please upload a scan of your ' +
          doc.type.toUpperCase() +
          '.',
      };
    }

    // Mock quality check
    const isLowQuality = fileName.includes('blur') || fileName.includes('low');
    if (isLowQuality) {
      return {
        ...doc,
        verificationStatus: 'rejected',
        qualityScore: 35,
        rejectionReason: 'Image too blurry to read document details accurately.',
      };
    }

    // Simulate Data Extraction based on type
    let extractedData = {};
    if (doc.type === 'pan') {
      extractedData = {
        idNumber: 'CYMPB' + Math.floor(1000 + Math.random() * 9000) + 'A',
        fullName: 'BORUGULA SURESH',
        dob: '06/03/1992',
        structureMatch: true,
      };
    } else if (doc.type === 'aadhaar') {
      extractedData = {
        idNumber: 'XXXX XXXX ' + Math.floor(1000 + Math.random() * 9000),
        fullName: 'ADITYA VERMA',
        gender: 'MALE',
        dob: '12/10/1985',
        address: '123, Sector 4, MG Road, Bangalore, KA - 560001',
        structureMatch: true,
      };
    } else {
      extractedData = {
        idNumber: 'GSTIN' + Math.floor(10000000 + Math.random() * 90000000),
        fullName: 'FLIGHTFLIGHT B2B PVT LTD',
        structureMatch: true,
      };
    }

    return {
      ...doc,
      verificationStatus: 'verified',
      qualityScore: 95 + Math.random() * 5,
      extractedData,
    };
  };

  const uploadDocument = async (doc: KYCDocument) => {
    const initialDoc: KYCDocument = {
      ...doc,
      verificationStatus: 'verifying',
    };

    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.type !== doc.type);
      return [...filtered, initialDoc];
    });

    const verifiedDoc = await verifyDocument(doc);

    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.type !== doc.type);
      const updated = [...filtered, verifiedDoc];

      // Update overall status after verification
      const allVerified = ['pan', 'aadhaar', 'gst'].every((type) =>
        updated.some((d) => d.type === type && d.verificationStatus === 'verified'),
      );

      if (allVerified) {
        setStatus('ready_to_submit');
      } else {
        setStatus('uploading');
      }

      return updated;
    });
  };

  const removeDocument = (type: 'pan' | 'aadhaar' | 'gst') => {
    setDocuments((prev) => {
      const updated = prev.filter((d) => d.type !== type);
      setStatus('uploading');
      return updated;
    });
  };

  const submitKYC = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const refId = `#KYC-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    setReferenceId(refId);
    setStatus('rejected');
    setIsLoading(false);
  };

  const refetch = () => {
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
    removeDocument,
  };
}
