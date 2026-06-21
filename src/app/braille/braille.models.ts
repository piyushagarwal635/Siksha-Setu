export type BrailleDotMode = 6 | 8;

export type BrailleContentArea =
  | 'COURSE_NOTES'
  | 'LESSON_CONTENT'
  | 'EDUCATIONAL_ARTICLE'
  | 'GOVERNMENT_SCHEME'
  | 'TEST';

export interface BrailleCell {
  unicode: string;
  dots: number[];
  mask: number;
  sourceStart: number;
  sourceEnd: number;
}

export interface BrailleTranslationRequest {
  text: string;
  contentArea: BrailleContentArea;
  dotMode: BrailleDotMode;
  table?: string;
}

export interface BrailleTranslation {
  originalText: string;
  braille: string;
  cells: BrailleCell[];
  contentArea: BrailleContentArea;
  dotMode: BrailleDotMode;
  table: string;
  engine: 'liblouis';
}

export type BrailleTransport = 'usb' | 'bluetooth' | 'virtual';
export type BrailleConnectionState =
  | 'checking'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'unsupported'
  | 'error';

export interface BrailleHardwareStatus {
  state: BrailleConnectionState;
  transport: BrailleTransport;
  deviceName: string | null;
  profileId: string | null;
  message: string;
}

export interface BrailleDeviceProfile {
  id: string;
  name: string;
  transport: Exclude<BrailleTransport, 'virtual'>;
  vendorId?: number;
  productId?: number;
  bluetoothServiceUuid?: string | number;
  bluetoothCharacteristicUuid?: string | number;
  usbConfiguration?: number;
  usbInterface?: number;
  usbEndpointOut?: number;
  cellCount: number;
  dotMode: BrailleDotMode;
}
