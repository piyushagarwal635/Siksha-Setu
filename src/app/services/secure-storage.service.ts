import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SecureStorageService {
  private cache = new Map<string, string>();
  private initialized = false;
  private isBrowser: boolean;

  // Static key material for PBKDF2
  private secretPassphrase = 'Siksha-Setu-Client-Side-Secure-Passphrase-2026-SuperKey!';
  private salt = new Uint8Array([83, 106, 107, 115, 104, 97, 83, 101, 116, 117, 83, 97, 108, 116, 50, 51]); // "SikshaSetuSalt23"
  private cryptoKey: CryptoKey | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  // Pre-decrypt known keys on startup
  public async initialize(): Promise<void> {
    if (!this.isBrowser || this.initialized) return;

    try {
      await this.initKey();
      
      const keysToLoad = ['authUser', 'token'];
      for (const key of keysToLoad) {
        // Check localStorage first
        let encrypted = localStorage.getItem(key);
        if (!encrypted) {
          // Check sessionStorage
          encrypted = sessionStorage.getItem(key);
        }

        if (encrypted) {
          try {
            const decrypted = await this.decrypt(encrypted);
            this.cache.set(key, decrypted);
          } catch (e) {
            console.error(`Tamper detected for key "${key}"! Clearing storage.`);
            this.clearAll();
          }
        }
      }
      this.initialized = true;
    } catch (e) {
      console.error('SecureStorage initialization failed', e);
    }
  }

  // Sync getItem from cache
  public getItem(key: string): string | null {
    return this.cache.get(key) || null;
  }

  // Async setItem (encrypts and stores in localStorage/sessionStorage)
  public async setItem(key: string, value: string, remember: boolean): Promise<void> {
    this.cache.set(key, value);
    if (!this.isBrowser) return;

    try {
      const encrypted = await this.encrypt(value);
      if (remember) {
        localStorage.setItem(key, encrypted);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, encrypted);
        localStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Failed to set encrypted item', e);
    }
  }

  // Sync/Async removeItem
  public removeItem(key: string): void {
    this.cache.delete(key);
    if (!this.isBrowser) return;

    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  public clearAll(): void {
    this.cache.clear();
    if (!this.isBrowser) return;

    localStorage.removeItem('authUser');
    localStorage.removeItem('token');
    sessionStorage.removeItem('authUser');
    sessionStorage.removeItem('token');
  }

  private async initKey(): Promise<void> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(this.secretPassphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    this.cryptoKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 1000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  private async ensureKey(): Promise<CryptoKey> {
    if (this.cryptoKey) return this.cryptoKey;
    await this.initKey();
    if (!this.cryptoKey) {
      throw new Error('CryptoKey not ready');
    }
    return this.cryptoKey;
  }

  // Helper to encrypt GCM
  private async encrypt(data: string): Promise<string> {
    const key = await this.ensureKey();
    const encoder = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for GCM
    
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoder.encode(data)
    );

    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  }

  // Helper to decrypt GCM
  private async decrypt(encryptedBase64: string): Promise<string> {
    const key = await this.ensureKey();
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    if (combined.length < 13) {
      throw new Error('Ciphertext too short');
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }
}
