// Flow Challenge Types
export type FlowChallengeType = 'biometric' | 'otp_email' | 'otp_sms' | 'otp_whatsapp' | 'liveness';
export type FlowChallengeStatus = 'ACTIVE' | 'PENDING' | 'COMPLETED';
export type FlowStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'FAILED';
export type OtpChannel = 'email' | 'sms' | 'whatsapp';

export interface FlowChallenge {
  status: FlowChallengeStatus;
  type: FlowChallengeType;
}

export interface ParticipantIdentity {
  documentNumber: string;
  email: string;
  phone: string;
}

export interface FlowParticipant {
  displayName: string;
  identity: ParticipantIdentity;
  participantId: string;
}

export interface FlowData {
  challenges: FlowChallenge[];
  currentStep: FlowChallengeType;
  pipeline: FlowChallengeType[];
}

// Initiate Flow Response
export interface FlowInitiateData {
  flow: FlowData;
  flowAuthToken: string;
  participant: FlowParticipant;
  processId: string;
  startedAt: string;
  status: FlowStatus;
  updatedAt: string;
}

// OTP Send Response
export interface OtpSendData {
  channel: OtpChannel;
  cooldownUntil: number;
  expiresAt: string;
  processId: string;
  status: 'SENT';
}

// OTP Verify Response
export interface OtpVerifyData {
  completed: boolean;
  nextStep: FlowChallengeType | null;
  processId: string;
  status: FlowStatus;
  verifiedStep: FlowChallengeType;
}

// Biometric Upload Info
export interface BiometricUpload {
  bucket: string;
  expiresIn: number;
  key: string;
  uploadUrl: string;
}

export interface BiometricUploads {
  selfie?: BiometricUpload;
  idFront?: BiometricUpload;
  idBack?: BiometricUpload;
}

export type BiometricRequirement = 'selfie' | 'idFront' | 'idBack';

// Biometric Start Response
export interface BiometricStartData {
  attempt: number;
  processId: string;
  required: BiometricRequirement[];
  step: string;
  uploads: BiometricUploads;
}

// Biometric Verify Response
export interface BiometricVerifyData {
  approved: boolean;
  documentMatch: boolean;
  nameMatch: boolean;
  processId: string;
  similarity: number;
  step: string;
}

// Liveness Session Response
export interface LivenessStartData {
  processId: string;
  sessionId: string;
  step: string;
}

// Flow Error Details
export interface FlowErrorDetails {
  reason?: string;
  currentStep?: FlowChallengeType;
  expectedStep?: FlowChallengeType;
  processId?: string;
}

export interface FlowError {
  details: FlowErrorDetails;
  type: string;
}

// Biometric Start Request
export interface BiometricStartRequest {
  require: BiometricRequirement[];
  contentTypes: Record<BiometricRequirement, string>;
}

// OTP Verify Request
export interface OtpVerifyRequest {
  channel: OtpChannel;
  code: string;
}

// Flow State for component use
export interface FlowState {
  processId: string;
  flowAuthToken: string;
  participant: FlowParticipant;
  currentStep: FlowChallengeType;
  pipeline: FlowChallengeType[];
  challenges: FlowChallenge[];
  status: FlowStatus;
}
