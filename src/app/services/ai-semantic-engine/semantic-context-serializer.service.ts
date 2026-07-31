import { Injectable } from '@angular/core';
import { SemanticContext } from './reactive-context.service';

@Injectable({
  providedIn: 'root'
})
export class SemanticContextSerializer {
  
  /**
   * Serializes the SemanticContext object to a compressed JSON string.
   * Handles null omission and ensures no massive payloads are sent.
   */
  public serialize(context: SemanticContext | null): string {
    if (!context) return '{}';

    const versionedContext = {
      ...context,
      schemaVersion: '2.0',
    };

    return JSON.stringify(versionedContext, (key, value) => {
      // Null omission
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Additional masking fallback (though forms should pre-mask)
      if (key.toLowerCase().includes('password')) {
        return '***';
      }

      // Compression: remove empty arrays/objects to save tokens
      if (Array.isArray(value) && value.length === 0) {
        return undefined;
      }
      if (typeof value === 'object' && Object.keys(value).length === 0) {
        return undefined;
      }

      return value;
    });
  }
}
