import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BrailleService {
  // Maps standard lowercase letters to raised dot numbers (1 to 6)
  private brailleDotsMap: { [key: string]: number[] } = {
    'a': [1],
    'b': [1, 2],
    'c': [1, 4],
    'd': [1, 4, 5],
    'e': [1, 5],
    'f': [1, 2, 4],
    'g': [1, 2, 4, 5],
    'h': [1, 2, 5],
    'i': [2, 4],
    'j': [2, 4, 5],
    'k': [1, 3],
    'l': [1, 2, 3],
    'm': [1, 3, 4],
    'n': [1, 3, 4, 5],
    'o': [1, 3, 5],
    'p': [1, 2, 3, 4],
    'q': [1, 2, 3, 4, 5],
    'r': [1, 2, 3, 5],
    's': [2, 3, 4],
    't': [2, 3, 4, 5],
    'u': [1, 3, 6],
    'v': [1, 2, 3, 6],
    'w': [2, 4, 5, 6],
    'x': [1, 3, 4, 6],
    'y': [1, 3, 4, 5, 6],
    'z': [1, 3, 5, 6],
    ' ': [],
    ',': [2],
    ';': [2, 3],
    ':': [2, 5],
    '.': [2, 5, 6],
    '!': [2, 3, 5],
    '(': [2, 3, 5, 6],
    ')': [2, 3, 5, 6],
    '?': [2, 3, 6],
    '"': [2, 3, 6],
    '-': [3, 6]
  };

  // Maps numbers 0-9 to their letter equivalents for Braille numbers
  private numberMap: { [key: string]: string } = {
    '1': 'a', '2': 'b', '3': 'c', '4': 'd', '5': 'e',
    '6': 'f', '7': 'g', '8': 'h', '9': 'i', '0': 'j'
  };

  // ASCII Braille map for BRF parsing (maps ASCII chars to Braille offset codes)
  private asciiBrailleMap: { [key: string]: number } = {
    ' ': 0,   '!': 22,  '"': 16,  '#': 34,  '$': 43,  '%': 41,  '&': 47,  '\'': 4,
    '(': 55,  ')': 59,  '*': 37,  '+': 44,  ',': 2,   '-': 36,  '.': 18,  '/': 12,
    '0': 52,  '1': 2,   '2': 6,   '3': 18,  '4': 30,  '5': 26,  '6': 22,  '7': 58,
    '8': 54,  '9': 20,  ':': 48,  ';': 40,  '<': 15,  '=': 62,  '>': 45,  '?': 31,
    '@': 7,   'A': 1,   'B': 3,   'C': 9,   'D': 25,  'E': 17,  'F': 11,  'G': 27,
    'H': 19,  'I': 10,  'J': 26,  'K': 5,   'L': 7,   'M': 13,  'N': 29,  'O': 21,
    'P': 15,  'Q': 31,  'R': 23,  'S': 14,  'T': 30,  'U': 37,  'V': 39,  'W': 58,
    'X': 45,  'Y': 61,  'Z': 53,  '[': 42,  '\\': 51, ']': 27,  '^': 20,  '_': 17,
    'a': 1,   'b': 3,   'c': 9,   'd': 25,  'e': 17,  'f': 11,  'g': 27,  'h': 19,
    'i': 10,  'j': 26,  'k': 5,   'l': 7,   'm': 13,  'n': 29,  'o': 21,  'p': 15,
    'q': 31,  'r': 23,  's': 14,  't': 30,  'u': 37,  'v': 39,  'w': 58,  'x': 45,
    'y': 61,  'z': 53
  };

  /**
   * Helper to convert dots array to Unicode Braille character
   */
  public dotsToUnicode(dots: number[]): string {
    let mask = 0;
    if (dots.includes(1)) mask |= 1;
    if (dots.includes(2)) mask |= 2;
    if (dots.includes(3)) mask |= 4;
    if (dots.includes(4)) mask |= 8;
    if (dots.includes(5)) mask |= 16;
    if (dots.includes(6)) mask |= 32;
    return String.fromCharCode(0x2800 + mask);
  }

  /**
   * Translates English text to real-time Unicode Braille characters
   */
  public translateText(text: string): string {
    if (!text) return '';
    let result = '';
    let inNumber = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle numbers (requires number sign cell: dots 3, 4, 5, 6 => Unicode \u283C)
      if (char >= '0' && char <= '9') {
        if (!inNumber) {
          result += String.fromCharCode(0x2800 + 60); // Number sign
          inNumber = true;
        }
        const letter = this.numberMap[char];
        const dots = this.brailleDotsMap[letter] || [];
        result += this.dotsToUnicode(dots);
      } else {
        inNumber = false;

        // Space
        if (char === ' ') {
          result += ' ';
          continue;
        }

        // Handle uppercase letters (requires capital sign: dot 6 => Unicode \u2820)
        const isUpper = char >= 'A' && char <= 'Z';
        const lowerChar = char.toLowerCase();
        
        if (isUpper) {
          result += String.fromCharCode(0x2800 + 32); // Capital sign
        }

        const dots = this.brailleDotsMap[lowerChar];
        if (dots) {
          result += this.dotsToUnicode(dots);
        } else {
          // Keep original punctuation or character if not mapped
          result += char;
        }
      }
    }

    return result;
  }

  /**
   * Translates English text to an array of aligned cell/original character structures.
   * This ensures capital indicators and number signs align 1-to-1 with their respective cells.
   */
  public getDisplayCells(text: string): { cell: string; original: string }[] {
    if (!text) return [];
    const result: { cell: string; original: string }[] = [];
    let inNumber = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Handle numbers
      if (char >= '0' && char <= '9') {
        if (!inNumber) {
          result.push({
            cell: String.fromCharCode(0x2800 + 60), // Number sign
            original: '#'
          });
          inNumber = true;
        }
        const letter = this.numberMap[char];
        const dots = this.brailleDotsMap[letter] || [];
        result.push({
          cell: this.dotsToUnicode(dots),
          original: char
        });
      } else {
        inNumber = false;

        // Space
        if (char === ' ') {
          result.push({
            cell: ' ',
            original: ' '
          });
          continue;
        }

        // Handle uppercase letters
        const isUpper = char >= 'A' && char <= 'Z';
        const lowerChar = char.toLowerCase();
        
        if (isUpper) {
          result.push({
            cell: String.fromCharCode(0x2800 + 32), // Capital sign
            original: '^'
          });
        }

        const dots = this.brailleDotsMap[lowerChar];
        if (dots) {
          result.push({
            cell: this.dotsToUnicode(dots),
            original: char
          });
        } else {
          result.push({
            cell: char,
            original: char
          });
        }
      }
    }

    return result;
  }

  /**
   * Returns a 2x3 boolean array representing dot states of a Unicode Braille character
   */
  public getDotStates(unicodeChar: string): boolean[] {
    const code = unicodeChar.charCodeAt(0);
    // Unicode Braille block is 0x2800 to 0x28FF
    if (code >= 0x2800 && code <= 0x28FF) {
      const mask = code - 0x2800;
      return [
        (mask & 1) !== 0,   // Dot 1
        (mask & 2) !== 0,   // Dot 2
        (mask & 4) !== 0,   // Dot 3
        (mask & 8) !== 0,   // Dot 4
        (mask & 16) !== 0,  // Dot 5
        (mask & 32) !== 0   // Dot 6
      ];
    }
    // Fallback/Space (all dots lowered)
    return [false, false, false, false, false, false];
  }

  /**
   * Parses BRF file contents (represented as ASCII Braille) and returns Unicode Braille
   */
  public parseBRF(content: string): string {
    if (!content) return '';
    let result = '';
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '\n' || char === '\r') {
        result += char;
      } else if (this.asciiBrailleMap[char] !== undefined) {
        const offset = this.asciiBrailleMap[char];
        result += String.fromCharCode(0x2800 + offset);
      } else {
        result += ' '; // Fallback to empty space
      }
    }
    return result;
  }
}
