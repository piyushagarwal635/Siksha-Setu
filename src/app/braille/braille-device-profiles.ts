import { BrailleDeviceProfile } from './braille.models';

/**
 * Production deployments should populate this allowlist from reviewed device
 * specifications. An empty list is intentional: unknown USB/Bluetooth devices
 * must never be treated as Braille hardware.
 */
export const BRAILLE_DEVICE_PROFILES: readonly BrailleDeviceProfile[] = [
  {
    id: 'orbit-20',
    name: 'Orbit Reader 20',
    transport: 'usb',
    vendorId: 0x0403, // FTDI used by some Orbits
    productId: 0x6001,
    cellCount: 20,
    dotMode: 8
  },
  {
    id: 'orbit-20-bt',
    name: 'Orbit Reader 20 (Bluetooth)',
    transport: 'bluetooth',
    bluetoothServiceUuid: '00001101-0000-1000-8000-00805f9b34fb', // Standard Serial Port Profile
    bluetoothCharacteristicUuid: '00002a3d-0000-1000-8000-00805f9b34fb',
    cellCount: 20,
    dotMode: 8
  },
  {
    id: 'focus-40-blue',
    name: 'Focus 40 Blue',
    transport: 'usb',
    vendorId: 0x0f4e, // Freedom Scientific
    productId: 0x0114,
    cellCount: 40,
    dotMode: 8
  },
  {
    id: 'brailliant-bi-40',
    name: 'Brailliant BI 40',
    transport: 'usb',
    vendorId: 0x1c71, // HumanWare
    productId: 0xc005,
    cellCount: 40,
    dotMode: 8
  }
];
