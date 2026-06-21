import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, map } from 'rxjs';
import { BRAILLE_DEVICE_PROFILES } from '../braille/braille-device-profiles';
import {
  BrailleCell,
  BrailleDeviceProfile,
  BrailleHardwareStatus
} from '../braille/braille.models';

const VIRTUAL_STATUS: BrailleHardwareStatus = {
  state: 'disconnected',
  transport: 'virtual',
  deviceName: null,
  profileId: null,
  message: 'No verified hardware detected. Virtual display is active.'
};

@Injectable({ providedIn: 'root' })
export class BrailleHardwareService {
  private readonly statusSubject = new BehaviorSubject<BrailleHardwareStatus>(VIRTUAL_STATUS);
  readonly status$ = this.statusSubject.asObservable();
  /** @deprecated Kept for the existing course shell while it migrates to status$. */
  readonly deviceStatus$ = this.status$.pipe(map(status => {
    if (status.state === 'connected') return `Connected (${status.transport.toUpperCase()})`;
    if (status.state === 'connecting' || status.state === 'checking') return 'Connecting...';
    if (status.state === 'error') return 'Connection Failed';
    return 'Disconnected';
  }));
  /** @deprecated Kept for the existing course shell while it migrates to status$. */
  readonly connectedDeviceName$ = this.status$.pipe(map(status => status.deviceName));

  private usbDevice: any | null = null;
  private bluetoothDevice: any | null = null;
  private bluetoothCharacteristic: any | null = null;
  private activeProfile: BrailleDeviceProfile | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get status(): BrailleHardwareStatus {
    return this.statusSubject.value;
  }

  async detectAuthorizedHardware(): Promise<boolean> {
    if (!this.isBrowser) return false;
    this.setChecking();

    if ('usb' in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        for (const device of devices) {
          const profile = this.findUsbProfile(device.vendorId, device.productId);
          if (profile && await this.openUsbDevice(device, profile)) return true;
        }
      } catch {
        // Detection failure is not a connection. Continue with virtual output.
      }
    }

    this.useVirtual('No authorized supported Braille display was found.');
    return false;
  }

  async connectUsb(): Promise<boolean> {
    if (!this.isBrowser || !('usb' in navigator)) {
      this.setUnsupported('WebUSB is not supported by this browser. Virtual display remains active.');
      return false;
    }
    if (!BRAILLE_DEVICE_PROFILES.some(profile => profile.transport === 'usb')) {
      this.setUnsupported('No reviewed USB Braille device profiles are configured.');
      return false;
    }

    this.setConnecting('usb', 'Choose a supported Braille display in the browser device picker.');
    try {
      const filters = BRAILLE_DEVICE_PROFILES
        .filter(profile => profile.transport === 'usb')
        .map(profile => ({ vendorId: profile.vendorId!, productId: profile.productId! }));
      const device = await (navigator as any).usb.requestDevice({ filters });
      const profile = this.findUsbProfile(device.vendorId, device.productId);
      if (!profile) {
        await this.safeCloseUsb(device);
        this.setError('The selected USB device is not an approved Braille display.');
        return false;
      }
      return await this.openUsbDevice(device, profile);
    } catch (error: any) {
      this.useVirtual(
        error?.name === 'NotFoundError'
          ? 'USB selection was cancelled. Virtual display remains active.'
          : 'USB Braille display verification failed.'
      );
      return false;
    }
  }

  /** Compatibility alias for the existing course component. */
  connectUSB(): Promise<boolean> {
    return this.connectUsb();
  }

  async connectBluetooth(): Promise<boolean> {
    if (!this.isBrowser || !('bluetooth' in navigator)) {
      this.setUnsupported('Web Bluetooth is not supported by this browser. Virtual display remains active.');
      return false;
    }
    const profiles = BRAILLE_DEVICE_PROFILES.filter(
      profile => profile.transport === 'bluetooth' && profile.bluetoothServiceUuid
    );
    if (!profiles.length) {
      this.setUnsupported('No reviewed Bluetooth Braille device profiles are configured.');
      return false;
    }

    this.setConnecting('bluetooth', 'Choose a supported Braille display in the browser device picker.');
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: profiles.map(profile => ({ services: [profile.bluetoothServiceUuid] })),
        optionalServices: profiles.map(profile => profile.bluetoothServiceUuid)
      });
      const server = await device.gatt?.connect();
      if (!server?.connected) throw new Error('GATT session was not established');

      let matched:
        | { profile: BrailleDeviceProfile; characteristic: any }
        | undefined;
      for (const profile of profiles) {
        try {
          const service = await server.getPrimaryService(profile.bluetoothServiceUuid);
          const characteristic = await service.getCharacteristic(profile.bluetoothCharacteristicUuid);
          matched = { profile, characteristic };
          break;
        } catch {
          // Try the next approved profile.
        }
      }
      if (!matched) {
        device.gatt?.disconnect();
        this.setError('Bluetooth service UUID did not match an approved Braille display.');
        return false;
      }

      this.bluetoothDevice = device;
      this.bluetoothCharacteristic = matched.characteristic;
      this.activeProfile = matched.profile;
      device.addEventListener('gattserverdisconnected', () => this.useVirtual('Braille display disconnected.'));
      this.statusSubject.next({
        state: 'connected',
        transport: 'bluetooth',
        deviceName: device.name || matched.profile.name,
        profileId: matched.profile.id,
        message: 'Verified Bluetooth Braille display connected.'
      });
      return true;
    } catch (error: any) {
      this.useVirtual(
        error?.name === 'NotFoundError'
          ? 'Bluetooth selection was cancelled. Virtual display remains active.'
          : 'Bluetooth Braille display verification failed.'
      );
      return false;
    }
  }

  async sendCells(cells: BrailleCell[]): Promise<boolean> {
    if (this.status.state !== 'connected' || !this.activeProfile) return false;
    const payload = new Uint8Array(
      cells.slice(0, this.activeProfile.cellCount).map(cell => cell.mask & 0xff)
    );
    try {
      if (this.status.transport === 'usb' && this.usbDevice) {
        const endpoint = this.activeProfile.usbEndpointOut;
        if (endpoint === undefined) throw new Error('Missing USB OUT endpoint');
        const result = await this.usbDevice.transferOut(endpoint, payload);
        if (result.status !== 'ok') throw new Error(`USB transfer status: ${result.status}`);
        return true;
      }
      if (this.status.transport === 'bluetooth' && this.bluetoothCharacteristic) {
        if (this.bluetoothCharacteristic.writeValueWithoutResponse) {
          await this.bluetoothCharacteristic.writeValueWithoutResponse(payload);
        } else {
          await this.bluetoothCharacteristic.writeValue(payload);
        }
        return true;
      }
    } catch {
      await this.disconnect('Hardware output failed. Switched to the virtual display.');
    }
    return false;
  }

  /** Compatibility adapter; still writes only to a verified physical session. */
  sendBrailleData(unicodeBraille: string, dotStates: boolean[][]): void {
    const cells: BrailleCell[] = dotStates.map((states, index) => ({
      unicode: unicodeBraille[index] || '\u2800',
      dots: states.flatMap((raised, dotIndex) => raised ? [dotIndex + 1] : []),
      mask: states.reduce((mask, raised, dotIndex) => raised ? mask | (1 << dotIndex) : mask, 0),
      sourceStart: index,
      sourceEnd: index + 1
    }));
    void this.sendCells(cells);
  }

  /** Compatibility alias for the existing course component. */
  autoDetectPreviousDevices(): Promise<boolean> {
    return this.detectAuthorizedHardware();
  }

  async disconnect(message = 'Braille hardware disconnected. Virtual display is active.'): Promise<void> {
    await this.safeCloseUsb(this.usbDevice);
    this.bluetoothDevice?.gatt?.disconnect();
    this.usbDevice = null;
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.activeProfile = null;
    this.useVirtual(message);
  }

  private async openUsbDevice(device: any, profile: BrailleDeviceProfile): Promise<boolean> {
    try {
      await device.open();
      if (!device.opened) throw new Error('USB device did not open');
      if (!device.configuration) {
        await device.selectConfiguration(profile.usbConfiguration ?? 1);
      }
      await device.claimInterface(profile.usbInterface ?? 0);

      this.usbDevice = device;
      this.activeProfile = profile;
      this.statusSubject.next({
        state: 'connected',
        transport: 'usb',
        deviceName: device.productName || profile.name,
        profileId: profile.id,
        message: 'Verified USB Braille display connected.'
      });
      return true;
    } catch {
      await this.safeCloseUsb(device);
      this.setError('USB identity matched, but the Braille display could not be opened.');
      return false;
    }
  }

  private findUsbProfile(vendorId: number, productId: number): BrailleDeviceProfile | undefined {
    return BRAILLE_DEVICE_PROFILES.find(profile =>
      profile.transport === 'usb' &&
      profile.vendorId === vendorId &&
      profile.productId === productId
    );
  }

  private async safeCloseUsb(device: any): Promise<void> {
    if (!device?.opened) return;
    try {
      if (this.activeProfile?.usbInterface !== undefined) {
        await device.releaseInterface(this.activeProfile.usbInterface);
      }
    } catch {}
    try { await device.close(); } catch {}
  }

  private setChecking(): void {
    this.statusSubject.next({
      ...VIRTUAL_STATUS,
      state: 'checking',
      message: 'Checking for previously authorized Braille hardware...'
    });
  }

  private setConnecting(transport: 'usb' | 'bluetooth', message: string): void {
    this.statusSubject.next({
      state: 'connecting',
      transport,
      deviceName: null,
      profileId: null,
      message
    });
  }

  private setUnsupported(message: string): void {
    this.statusSubject.next({ ...VIRTUAL_STATUS, state: 'unsupported', message });
  }

  private setError(message: string): void {
    this.statusSubject.next({ ...VIRTUAL_STATUS, state: 'error', message });
  }

  private useVirtual(message: string): void {
    this.statusSubject.next({ ...VIRTUAL_STATUS, message });
  }
}
