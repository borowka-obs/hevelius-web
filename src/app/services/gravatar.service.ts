import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class GravatarService {
    getAvatarUrl(email?: string | null, fallbackId?: string | null, size = 32): string {
        const normalizedEmail = (email ?? '').trim().toLowerCase();
        const hashInput = normalizedEmail || (fallbackId ?? 'hevelius-user').trim().toLowerCase();
        const hash = this.md5(hashInput);
        return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
    }

    // RFC 1321 MD5 implementation for deterministic Gravatar hashes.
    private md5(input: string): string {
        const textEncoder = new TextEncoder();
        const bytes = textEncoder.encode(input);
        const words = this.toWordArray(bytes);
        const bitLength = bytes.length * 8;

        words[bitLength >> 5] |= 0x80 << (bitLength % 32);
        words[(((bitLength + 64) >>> 9) << 4) + 14] = bitLength;

        let a = 0x67452301;
        let b = 0xefcdab89;
        let c = 0x98badcfe;
        let d = 0x10325476;

        for (let i = 0; i < words.length; i += 16) {
            const originalA = a;
            const originalB = b;
            const originalC = c;
            const originalD = d;

            a = this.ff(a, b, c, d, words[i], 7, -680876936);
            d = this.ff(d, a, b, c, words[i + 1], 12, -389564586);
            c = this.ff(c, d, a, b, words[i + 2], 17, 606105819);
            b = this.ff(b, c, d, a, words[i + 3], 22, -1044525330);
            a = this.ff(a, b, c, d, words[i + 4], 7, -176418897);
            d = this.ff(d, a, b, c, words[i + 5], 12, 1200080426);
            c = this.ff(c, d, a, b, words[i + 6], 17, -1473231341);
            b = this.ff(b, c, d, a, words[i + 7], 22, -45705983);
            a = this.ff(a, b, c, d, words[i + 8], 7, 1770035416);
            d = this.ff(d, a, b, c, words[i + 9], 12, -1958414417);
            c = this.ff(c, d, a, b, words[i + 10], 17, -42063);
            b = this.ff(b, c, d, a, words[i + 11], 22, -1990404162);
            a = this.ff(a, b, c, d, words[i + 12], 7, 1804603682);
            d = this.ff(d, a, b, c, words[i + 13], 12, -40341101);
            c = this.ff(c, d, a, b, words[i + 14], 17, -1502002290);
            b = this.ff(b, c, d, a, words[i + 15], 22, 1236535329);

            a = this.gg(a, b, c, d, words[i + 1], 5, -165796510);
            d = this.gg(d, a, b, c, words[i + 6], 9, -1069501632);
            c = this.gg(c, d, a, b, words[i + 11], 14, 643717713);
            b = this.gg(b, c, d, a, words[i], 20, -373897302);
            a = this.gg(a, b, c, d, words[i + 5], 5, -701558691);
            d = this.gg(d, a, b, c, words[i + 10], 9, 38016083);
            c = this.gg(c, d, a, b, words[i + 15], 14, -660478335);
            b = this.gg(b, c, d, a, words[i + 4], 20, -405537848);
            a = this.gg(a, b, c, d, words[i + 9], 5, 568446438);
            d = this.gg(d, a, b, c, words[i + 14], 9, -1019803690);
            c = this.gg(c, d, a, b, words[i + 3], 14, -187363961);
            b = this.gg(b, c, d, a, words[i + 8], 20, 1163531501);
            a = this.gg(a, b, c, d, words[i + 13], 5, -1444681467);
            d = this.gg(d, a, b, c, words[i + 2], 9, -51403784);
            c = this.gg(c, d, a, b, words[i + 7], 14, 1735328473);
            b = this.gg(b, c, d, a, words[i + 12], 20, -1926607734);

            a = this.hh(a, b, c, d, words[i + 5], 4, -378558);
            d = this.hh(d, a, b, c, words[i + 8], 11, -2022574463);
            c = this.hh(c, d, a, b, words[i + 11], 16, 1839030562);
            b = this.hh(b, c, d, a, words[i + 14], 23, -35309556);
            a = this.hh(a, b, c, d, words[i + 1], 4, -1530992060);
            d = this.hh(d, a, b, c, words[i + 4], 11, 1272893353);
            c = this.hh(c, d, a, b, words[i + 7], 16, -155497632);
            b = this.hh(b, c, d, a, words[i + 10], 23, -1094730640);
            a = this.hh(a, b, c, d, words[i + 13], 4, 681279174);
            d = this.hh(d, a, b, c, words[i], 11, -358537222);
            c = this.hh(c, d, a, b, words[i + 3], 16, -722521979);
            b = this.hh(b, c, d, a, words[i + 6], 23, 76029189);
            a = this.hh(a, b, c, d, words[i + 9], 4, -640364487);
            d = this.hh(d, a, b, c, words[i + 12], 11, -421815835);
            c = this.hh(c, d, a, b, words[i + 15], 16, 530742520);
            b = this.hh(b, c, d, a, words[i + 2], 23, -995338651);

            a = this.ii(a, b, c, d, words[i], 6, -198630844);
            d = this.ii(d, a, b, c, words[i + 7], 10, 1126891415);
            c = this.ii(c, d, a, b, words[i + 14], 15, -1416354905);
            b = this.ii(b, c, d, a, words[i + 5], 21, -57434055);
            a = this.ii(a, b, c, d, words[i + 12], 6, 1700485571);
            d = this.ii(d, a, b, c, words[i + 3], 10, -1894986606);
            c = this.ii(c, d, a, b, words[i + 10], 15, -1051523);
            b = this.ii(b, c, d, a, words[i + 1], 21, -2054922799);
            a = this.ii(a, b, c, d, words[i + 8], 6, 1873313359);
            d = this.ii(d, a, b, c, words[i + 15], 10, -30611744);
            c = this.ii(c, d, a, b, words[i + 6], 15, -1560198380);
            b = this.ii(b, c, d, a, words[i + 13], 21, 1309151649);
            a = this.ii(a, b, c, d, words[i + 4], 6, -145523070);
            d = this.ii(d, a, b, c, words[i + 11], 10, -1120210379);
            c = this.ii(c, d, a, b, words[i + 2], 15, 718787259);
            b = this.ii(b, c, d, a, words[i + 9], 21, -343485551);

            a = this.safeAdd(a, originalA);
            b = this.safeAdd(b, originalB);
            c = this.safeAdd(c, originalC);
            d = this.safeAdd(d, originalD);
        }

        return this.toHex(a) + this.toHex(b) + this.toHex(c) + this.toHex(d);
    }

    private toWordArray(bytes: Uint8Array): number[] {
        const words: number[] = [];
        for (let i = 0; i < bytes.length; i += 1) {
            words[i >> 2] |= bytes[i] << ((i % 4) * 8);
        }
        return words;
    }

    private rotateLeft(value: number, shift: number): number {
        return (value << shift) | (value >>> (32 - shift));
    }

    private safeAdd(x: number, y: number): number {
        const low = (x & 0xffff) + (y & 0xffff);
        const high = (x >> 16) + (y >> 16) + (low >> 16);
        return (high << 16) | (low & 0xffff);
    }

    private cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
        return this.safeAdd(this.rotateLeft(this.safeAdd(this.safeAdd(a, q), this.safeAdd(x, t)), s), b);
    }

    private ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return this.cmn((b & c) | (~b & d), a, b, x, s, t);
    }

    private gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return this.cmn((b & d) | (c & ~d), a, b, x, s, t);
    }

    private hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return this.cmn(b ^ c ^ d, a, b, x, s, t);
    }

    private ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
        return this.cmn(c ^ (b | ~d), a, b, x, s, t);
    }

    private toHex(value: number): string {
        let result = '';
        for (let i = 0; i < 4; i += 1) {
            const byte = (value >> (i * 8)) & 0xff;
            result += (`0${byte.toString(16)}`).slice(-2);
        }
        return result;
    }
}
