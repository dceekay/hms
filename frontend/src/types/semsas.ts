export type SemsasTransferType =
  | "hospital_ambulance_to_other_hospital"
  | "hospital_ambulance_to_this_hospital"
  | "external_ambulance_to_this_hospital";

export type SemsasTransfer = {
  id: string;
  transferType: SemsasTransferType;
  patientId?: string | null;
  patientName: string;
  patientPhone?: string | null;
  fromFacility: string;
  toFacility: string;
  ambulanceProvider?: string | null;
  ambulancePlateNumber?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
  transferDate: string;
  feeAmount?: number | string | null;
  notes?: string | null;
  filedMonth?: string | null;
  filedAt?: string | null;
  filingNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SemsasTransferFormValues = {
  transferType: SemsasTransferType;
  patientName: string;
  patientPhone: string;
  fromFacility: string;
  toFacility: string;
  ambulanceProvider: string;
  ambulancePlateNumber: string;
  driverName: string;
  driverPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  transferDate: string;
  feeAmount: string;
  notes: string;
};

export type SemsasListMeta = {
  page: number;
  take: number;
  total: number;
  totalPages: number;
};
