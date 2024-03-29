const soundEffectMap: string[] = [];

export function getSoundEffectMapMP1(table: number) {
  return soundEffectMap;
}

// To actually use the raw sounds above with PlaySound, this mapping is useful.
// The numbers on the left are what would be passed to PlaySound.
// The numbers on the right are the raw sound index that would be played for the given left number.

// 0x00: 0x01
// 0x01: 0x01
// 0x02: 0x01
// 0x03: 0x02
// 0x04: 0x02
// 0x05: 0x02
// 0x06: 0x02
// 0x07: 0x02
// 0x08: 0x02
// 0x09: 0x03
// 0x0A: 0x03
// 0x0B: 0x03
// 0x0C: 0xB5
// 0x0D: 0x12B
// 0x0E: 0xD9
// 0x0F: 0x12B
// 0x10: 0xD9
// 0x11: 0x13
// 0x12: 0x130
// 0x13: 0x142
// 0x14: 0x3B
// 0x15: 0x69
// 0x16: 0x04
// 0x17: 0x130
// 0x18: 0x142
// 0x19: 0xB2
// 0x1A: 0x141
// 0x1B: 0x04
// 0x1C: 0x04
// 0x1D: 0x04
// 0x1E: 0x05
// 0x1F: 0x134
// 0x20: 0x06
// 0x21: 0x06
// 0x22: 0x06
// 0x23: 0x07
// 0x24: 0x08
// 0x25: 0x09
// 0x26: 0x69
// 0x27: 0x0A
// 0x28: 0x0B
// 0x29: 0x10E
// 0x2A: 0x0C
// 0x2B: 0x46
// 0x2C: 0x46
// 0x2D: 0x0D
// 0x2E: 0x0D
// 0x2F: 0x0E
// 0x30: 0x0F
// 0x31: 0x10
// 0x32: 0x11
// 0x33: 0x11
// 0x34: 0x0D
// 0x35: 0x12
// 0x36: 0x65
// 0x37: 0x65
// 0x38: 0x13
// 0x39: 0x13
// 0x3A: 0x65
// 0x3B: 0x65
// 0x3C: 0x189
// 0x3D: 0x14
// 0x3E: 0x15
// 0x3F: 0x25
// 0x40: 0x16
// 0x41: 0x17
// 0x42: 0x18
// 0x43: 0x5C
// 0x44: 0x3B
// 0x45: 0x3B
// 0x46: 0x1A
// 0x47: 0x1B
// 0x48: 0x19
// 0x49: 0x19
// 0x4A: 0x130
// 0x4B: 0x1C
// 0x4C: 0x18C
// 0x4D: 0x18D
// 0x4E: 0x1D
// 0x4F: 0x1E
// 0x50: 0x68
// 0x51: 0x69
// 0x52: 0x1F
// 0x53: 0x56
// 0x54: 0x23
// 0x55: 0x20
// 0x56: 0x21
// 0x57: 0x22
// 0x58: 0x23
// 0x59: 0x24
// 0x5A: 0x25
// 0x5B: 0x19
// 0x5C: 0x26
// 0x5D: 0x27
// 0x5E: 0x6D
// 0x5F: 0x12
// 0x60: 0x28
// 0x61: 0x10
// 0x62: 0x3B
// 0x63: 0x66
// 0x64: 0x2A
// 0x65: 0x72
// 0x66: 0x72
// 0x67: 0x3B
// 0x68: 0x3B
// 0x69: 0x3B
// 0x6A: 0x29
// 0x6B: 0x2A
// 0x6C: 0x2B
// 0x6D: 0x2A
// 0x6E: 0x3B
// 0x6F: 0x3B
// 0x70: 0x3B
// 0x71: 0x2C
// 0x72: 0x2C
// 0x73: 0x110
// 0x74: 0x110
// 0x75: 0x12C
// 0x76: 0x12C
// 0x77: 0x2D
// 0x78: 0x2E
// 0x79: 0x2A
// 0x7A: 0x2F
// 0x7B: 0x30
// 0x7C: 0x31
// 0x7D: 0x32
// 0x7E: 0x33
// 0x7F: 0x34
// 0x80: 0x35
// 0x81: 0x36
// 0x82: 0x37
// 0x83: 0x38
// 0x84: 0x39
// 0x85: 0x39
// 0x86: 0xCC
// 0x87: 0x39
// 0x88: 0x39
// 0x89: 0xCC
// 0x8A: 0x110
// 0x8B: 0x3A
// 0x8C: 0xD8
// 0x8D: 0x110
// 0x8E: 0x110
// 0x8F: 0x169
// 0x90: 0x16A
// 0x91: 0x18D
// 0x92: 0xD8
// 0x93: 0x110
// 0x94: 0x163
// 0x95: 0x163
// 0x96: 0x3C
// 0x97: 0x3C
// 0x98: 0xF9
// 0x99: 0xDE
// 0x9A: 0x18C
// 0x9B: 0xF9
// 0x9C: 0x189
// 0x9D: 0x3D
// 0x9E: 0x89
// 0x9F: 0x110
// 0xA0: 0x18C
// 0xA1: 0x65
// 0xA2: 0xDF
// 0xA3: 0xF9
// 0xA4: 0x18C
// 0xA5: 0x2A
// 0xA6: 0x3E
// 0xA7: 0x65
// 0xA8: 0xF9
// 0xA9: 0xDE
// 0xAA: 0x164
// 0xAB: 0x164
// 0xAC: 0x18
// 0xAD: 0x18A
// 0xAE: 0x18A
// 0xAF: 0x3F
// 0xB0: 0x40
// 0xB1: 0x41
// 0xB2: 0x95
// 0xB3: 0x41
// 0xB4: 0x95
// 0xB5: 0xED
// 0xB6: 0xF5
// 0xB7: 0x110
// 0xB8: 0x18C
// 0xB9: 0x18C
// 0xBA: 0x41
// 0xBB: 0xF1
// 0xBC: 0x42
// 0xBD: 0x42
// 0xBE: 0x43
// 0xBF: 0x162
// 0xC0: 0x162
// 0xC1: 0x44
// 0xC2: 0xC9
// 0xC3: 0xC9
// 0xC4: 0x49
// 0xC5: 0x49
// 0xC6: 0x10B
// 0xC7: 0x66
// 0xC8: 0x45
// 0xC9: 0x46
// 0xCA: 0x46
// 0xCB: 0x47
// 0xCC: 0x47
// 0xCD: 0x116
// 0xCE: 0x10E
// 0xCF: 0x10E
// 0xD0: 0x43
// 0xD1: 0x10B
// 0xD2: 0x66
// 0xD3: 0x10E
// 0xD4: 0x48
// 0xD5: 0x49
// 0xD6: 0x49
// 0xD7: 0x4A
// 0xD8: 0x4B
// 0xD9: 0x4C
// 0xDA: 0x4D
// 0xDB: 0x4A
// 0xDC: 0x4B
// 0xDD: 0x4C
// 0xDE: 0x4E
// 0xDF: 0x86
// 0xE0: 0x6C
// 0xE1: 0x49
// 0xE2: 0xD8
// 0xE3: 0xD8
// 0xE4: 0x110
// 0xE5: 0x4F
// 0xE6: 0x18C
// 0xE7: 0x18C
// 0xE8: 0x50
// 0xE9: 0x51
// 0xEA: 0x21
// 0xEB: 0x52
// 0xEC: 0x52
// 0xED: 0x52
// 0xEE: 0x18D
// 0xEF: 0x18D
// 0xF0: 0x53
// 0xF1: 0x53
// 0xF2: 0x54
// 0xF3: 0x54
// 0xF4: 0x64
// 0xF5: 0x55
// 0xF6: 0x56
// 0xF7: 0x57
// 0xF8: 0x58
// 0xF9: 0x59
// 0xFA: 0x5A
// 0xFB: 0x5B
// 0xFC: 0x5C
// 0xFD: 0x5D
// 0xFE: 0x5E
// 0xFF: 0x60
// 0x100: 0x61
// 0x101: 0x62
// 0x102: 0x63
// 0x103: 0x68
// 0x104: 0x69
// 0x105: 0x5F
// 0x106: 0x6B
// 0x107: 0x6C
// 0x108: 0x70
// 0x109: 0x72
// 0x10A: 0x73
// 0x10B: 0x74
// 0x10C: 0x75
// 0x10D: 0x69
// 0x10E: 0x6A
// 0x10F: 0x6B
// 0x110: 0x6C
// 0x111: 0x64
// 0x112: 0x76
// 0x113: 0x76
// 0x114: 0x76
// 0x115: 0x77
// 0x116: 0x78
// 0x117: 0x79
// 0x118: 0x7A
// 0x119: 0x7B
// 0x11A: 0x7B
// 0x11B: 0x7B
// 0x11C: 0x7C
// 0x11D: 0x7D
// 0x11E: 0x7E
// 0x11F: 0x7F
// 0x120: 0x84
// 0x121: 0x84
// 0x122: 0x84
// 0x123: 0x84
// 0x124: 0x84
// 0x125: 0x84
// 0x126: 0x84
// 0x127: 0x80
// 0x128: 0x80
// 0x129: 0x80
// 0x12A: 0x81
// 0x12B: 0x82
// 0x12C: 0x83
// 0x12D: 0x83
// 0x12E: 0x85
// 0x12F: 0x85
// 0x130: 0x85
// 0x131: 0x85
// 0x132: 0x85
// 0x133: 0x85
// 0x134: 0x85
// 0x135: 0x86
// 0x136: 0x86
// 0x137: 0x86
// 0x138: 0x86
// 0x139: 0x86
// 0x13A: 0x86
// 0x13B: 0x86
// 0x13C: 0x86
// 0x13D: 0x86
// 0x13E: 0x86
// 0x13F: 0x86
// 0x140: 0x86
// 0x141: 0x86
// 0x142: 0x86
// 0x143: 0x87
// 0x144: 0x89
// 0x145: 0x8A
// 0x146: 0x8B
// 0x147: 0x86
// 0x148: 0x86
// 0x149: 0x86
// 0x14A: 0x86
// 0x14B: 0x86
// 0x14C: 0x86
// 0x14D: 0x86
// 0x14E: 0x8C
// 0x14F: 0x8C
// 0x150: 0x8C
// 0x151: 0x8C
// 0x152: 0x8C
// 0x153: 0x8C
// 0x154: 0x8C
// 0x155: 0x8D
// 0x156: 0x8E
// 0x157: 0x8F
// 0x158: 0x8F
// 0x159: 0x8F
// 0x15A: 0x8F
// 0x15B: 0x8F
// 0x15C: 0x8F
// 0x15D: 0x8F
// 0x15E: 0x90
// 0x15F: 0x91
// 0x160: 0x86
// 0x161: 0x92
// 0x162: 0x93
// 0x163: 0x94
// 0x164: 0x94
// 0x165: 0x94
// 0x166: 0x94
// 0x167: 0x94
// 0x168: 0x94
// 0x169: 0x94
// 0x16A: 0x95
// 0x16B: 0x95
// 0x16C: 0x95
// 0x16D: 0x95
// 0x16E: 0x95
// 0x16F: 0x95
// 0x170: 0x95
// 0x171: 0x95
// 0x172: 0x95
// 0x173: 0x95
// 0x174: 0x95
// 0x175: 0x95
// 0x176: 0x95
// 0x177: 0x95
// 0x178: 0x95
// 0x179: 0x95
// 0x17A: 0x95
// 0x17B: 0x95
// 0x17C: 0x95
// 0x17D: 0x95
// 0x17E: 0x95
// 0x17F: 0x96
// 0x180: 0x96
// 0x181: 0x96
// 0x182: 0x96
// 0x183: 0x96
// 0x184: 0x96
// 0x185: 0x96
// 0x186: 0x96
// 0x187: 0x96
// 0x188: 0x96
// 0x189: 0x96
// 0x18A: 0x96
// 0x18B: 0x96
// 0x18C: 0x96
// 0x18D: 0x97
// 0x18E: 0x97
// 0x18F: 0x97
// 0x190: 0x97
// 0x191: 0x97
// 0x192: 0x97
// 0x193: 0x97
// 0x194: 0x98
// 0x195: 0x6F
// 0x196: 0x99
// 0x197: 0x69
// 0x198: 0x9A
// 0x199: 0x9B
// 0x19A: 0x9C
// 0x19B: 0x9C
// 0x19C: 0x9D
// 0x19D: 0x9E
// 0x19E: 0x9F
// 0x19F: 0xA0
// 0x1A0: 0xA0
// 0x1A1: 0x9F
// 0x1A2: 0xA1
// 0x1A3: 0xA1
// 0x1A4: 0xA2
// 0x1A5: 0xA3
// 0x1A6: 0xA3
// 0x1A7: 0xA6
// 0x1A8: 0xA6
// 0x1A9: 0xA5
// 0x1AA: 0xA3
// 0x1AB: 0xA3
// 0x1AC: 0xA4
// 0x1AD: 0xA2
// 0x1AE: 0xA4
// 0x1AF: 0xA6
// 0x1B0: 0xA6
// 0x1B1: 0xA7
// 0x1B2: 0xA8
// 0x1B3: 0xA9
// 0x1B4: 0xA9
// 0x1B5: 0xA6
// 0x1B6: 0xA3
// 0x1B7: 0xA3
// 0x1B8: 0xA1
// 0x1B9: 0xA1
// 0x1BA: 0xA2
// 0x1BB: 0xA9
// 0x1BC: 0xA9
// 0x1BD: 0xA9
// 0x1BE: 0xA9
// 0x1BF: 0xA1
// 0x1C0: 0xAA
// 0x1C1: 0xAB
// 0x1C2: 0xAC
// 0x1C3: 0x18C
// 0x1C4: 0xAD
// 0x1C5: 0xAD
// 0x1C6: 0x69
// 0x1C7: 0x61
// 0x1C8: 0xAE
// 0x1C9: 0xAE
// 0x1CA: 0xAE
// 0x1CB: 0xB4
// 0x1CC: 0xB4
// 0x1CD: 0xAF
// 0x1CE: 0xB4
// 0x1CF: 0xAF
// 0x1D0: 0xB4
// 0x1D1: 0xB0
// 0x1D2: 0xB1
// 0x1D3: 0xB2
// 0x1D4: 0xB3
// 0x1D5: 0xB4
// 0x1D6: 0xB5
// 0x1D7: 0xB6
// 0x1D8: 0x69
// 0x1D9: 0xB6
// 0x1DA: 0xB7
// 0x1DB: 0xCC
// 0x1DC: 0x69
// 0x1DD: 0xB8
// 0x1DE: 0xB9
// 0x1DF: 0xBA
// 0x1E0: 0x99
// 0x1E1: 0x99
// 0x1E2: 0xBB
// 0x1E3: 0xBC
// 0x1E4: 0xBD
// 0x1E5: 0xBD
// 0x1E6: 0xBE
// 0x1E7: 0x168
// 0x1E8: 0x168
// 0x1E9: 0x168
// 0x1EA: 0x69
// 0x1EB: 0xBF
// 0x1EC: 0xBF
// 0x1ED: 0xC0
// 0x1EE: 0xC0
// 0x1EF: 0xC1
// 0x1F0: 0xC2
// 0x1F1: 0xC0
// 0x1F2: 0x9F
// 0x1F3: 0x9A
// 0x1F4: 0x9F
// 0x1F5: 0x9F
// 0x1F6: 0xC3
// 0x1F7: 0xC3
// 0x1F8: 0xC3
// 0x1F9: 0xC3
// 0x1FA: 0xC3
// 0x1FB: 0xC3
// 0x1FC: 0xC3
// 0x1FD: 0xC4
// 0x1FE: 0xC4
// 0x1FF: 0xC4
// 0x200: 0xC5
// 0x201: 0xC6
// 0x202: 0xC7
// 0x203: 0xC8
// 0x204: 0xC9
// 0x205: 0xC9
// 0x206: 0x162
// 0x207: 0x162
// 0x208: 0x162
// 0x209: 0x162
// 0x20A: 0x6D
// 0x20B: 0x6D
// 0x20C: 0x162
// 0x20D: 0x162
// 0x20E: 0xCA
// 0x20F: 0x12F
// 0x210: 0xBF
// 0x211: 0xCB
// 0x212: 0xCB
// 0x213: 0xCB
// 0x214: 0xCB
// 0x215: 0xCB
// 0x216: 0x65
// 0x217: 0xCD
// 0x218: 0xCC
// 0x219: 0x68
// 0x21A: 0x69
// 0x21B: 0xAE
// 0x21C: 0x65
// 0x21D: 0xCE
// 0x21E: 0xCF
// 0x21F: 0xD0
// 0x220: 0xD0
// 0x221: 0xC2
// 0x222: 0xD1
// 0x223: 0xD1
// 0x224: 0xD2
// 0x225: 0xD3
// 0x226: 0xD3
// 0x227: 0xD4
// 0x228: 0xD4
// 0x229: 0xD4
// 0x22A: 0xD4
// 0x22B: 0x99
// 0x22C: 0xD5
// 0x22D: 0x69
// 0x22E: 0xD6
// 0x22F: 0x71
// 0x230: 0x135
// 0x231: 0xD2
// 0x232: 0xC2
// 0x233: 0xD2
// 0x234: 0xD7
// 0x235: 0xD8
// 0x236: 0xD9
// 0x237: 0xDA
// 0x238: 0xD7
// 0x239: 0x67
// 0x23A: 0x65
// 0x23B: 0x18E
// 0x23C: 0xDB
// 0x23D: 0x65
// 0x23E: 0x116
// 0x23F: 0xDC
// 0x240: 0xDD
// 0x241: 0xDE
// 0x242: 0xDF
// 0x243: 0xDF
// 0x244: 0xDF
// 0x245: 0xE0
// 0x246: 0xE0
// 0x247: 0xE0
// 0x248: 0xE0
// 0x249: 0xE1
// 0x24A: 0x69
// 0x24B: 0x48
// 0x24C: 0xE2
// 0x24D: 0xE3
// 0x24E: 0xE4
// 0x24F: 0xE5
// 0x250: 0x67
// 0x251: 0xED
// 0x252: 0xF5
// 0x253: 0x8C
// 0x254: 0x8C
// 0x255: 0xE6
// 0x256: 0xE6
// 0x257: 0xE7
// 0x258: 0xE8
// 0x259: 0x12E
// 0x25A: 0xE9
// 0x25B: 0xEA
// 0x25C: 0xEB
// 0x25D: 0xEB
// 0x25E: 0xEB
// 0x25F: 0xEC
// 0x260: 0x69
// 0x261: 0x69
// 0x262: 0x69
// 0x263: 0xED
// 0x264: 0x168
// 0x265: 0xBE
// 0x266: 0xE8
// 0x267: 0xE9
// 0x268: 0xEE
// 0x269: 0x67
// 0x26A: 0xEE
// 0x26B: 0xEF
// 0x26C: 0xF0
// 0x26D: 0xF1
// 0x26E: 0x6D
// 0x26F: 0xF2
// 0x270: 0xF3
// 0x271: 0xF4
// 0x272: 0xF5
// 0x273: 0xF6
// 0x274: 0xF6
// 0x275: 0xF6
// 0x276: 0xF7
// 0x277: 0xF6
// 0x278: 0xF8
// 0x279: 0xF8
// 0x27A: 0xFA
// 0x27B: 0xFB
// 0x27C: 0xA3
// 0x27D: 0xFC
// 0x27E: 0xFC
// 0x27F: 0xFC
// 0x280: 0xFC
// 0x281: 0xFC
// 0x282: 0xFC
// 0x283: 0xFC
// 0x284: 0x6E
// 0x285: 0x6E
// 0x286: 0x6E
// 0x287: 0x6E
// 0x288: 0x6E
// 0x289: 0x6E
// 0x28A: 0x6E
// 0x28B: 0xFD
// 0x28C: 0xFE
// 0x28D: 0x12B
// 0x28E: 0xFF
// 0x28F: 0x100
// 0x290: 0x95
// 0x291: 0x95
// 0x292: 0x97
// 0x293: 0x96
// 0x294: 0x97
// 0x295: 0x101
// 0x296: 0x102
// 0x297: 0x103
// 0x298: 0x101
// 0x299: 0x104
// 0x29A: 0x9F
// 0x29B: 0x104
// 0x29C: 0x12E
// 0x29D: 0x9B
// 0x29E: 0x105
// 0x29F: 0x10B
// 0x2A0: 0x93
// 0x2A1: 0x106
// 0x2A2: 0x104
// 0x2A3: 0x107
// 0x2A4: 0x107
// 0x2A5: 0x107
// 0x2A6: 0x108
// 0x2A7: 0x108
// 0x2A8: 0x97
// 0x2A9: 0x71
// 0x2AA: 0x109
// 0x2AB: 0x97
// 0x2AC: 0x10A
// 0x2AD: 0x6D
// 0x2AE: 0x10B
// 0x2AF: 0x97
// 0x2B0: 0x71
// 0x2B1: 0x10C
// 0x2B2: 0x6E
// 0x2B3: 0x10D
// 0x2B4: 0x6D
// 0x2B5: 0x164
// 0x2B6: 0x10E
// 0x2B7: 0x10F
// 0x2B8: 0x110
// 0x2B9: 0x111
// 0x2BA: 0x6D
// 0x2BB: 0xF1
// 0x2BC: 0x112
// 0x2BD: 0x97
// 0x2BE: 0x113
// 0x2BF: 0x114
// 0x2C0: 0x115
// 0x2C1: 0x116
// 0x2C2: 0x116
// 0x2C3: 0x116
// 0x2C4: 0x116
// 0x2C5: 0x116
// 0x2C6: 0x116
// 0x2C7: 0x116
// 0x2C8: 0x117
// 0x2C9: 0x118
// 0x2CA: 0x65
// 0x2CB: 0x113
// 0x2CC: 0x114
// 0x2CD: 0x97
// 0x2CE: 0x71
// 0x2CF: 0x97
// 0x2D0: 0x95
// 0x2D1: 0x95
// 0x2D2: 0x119
// 0x2D3: 0x11A
// 0x2D4: 0x11B
// 0x2D5: 0x11B
// 0x2D6: 0x11C
// 0x2D7: 0x11D
// 0x2D8: 0x11E
// 0x2D9: 0x11F
// 0x2DA: 0x120
// 0x2DB: 0x120
// 0x2DC: 0x11C
// 0x2DD: 0x121
// 0x2DE: 0x122
// 0x2DF: 0x123
// 0x2E0: 0x123
// 0x2E1: 0x14A
// 0x2E2: 0x14C
// 0x2E3: 0x14E
// 0x2E4: 0x122
// 0x2E5: 0x124
// 0x2E6: 0x124
// 0x2E7: 0x124
// 0x2E8: 0x125
// 0x2E9: 0x125
// 0x2EA: 0x125
// 0x2EB: 0x126
// 0x2EC: 0x126
// 0x2ED: 0x126
// 0x2EE: 0x127
// 0x2EF: 0x127
// 0x2F0: 0x127
// 0x2F1: 0x126
// 0x2F2: 0x127
// 0x2F3: 0x128
// 0x2F4: 0x128
// 0x2F5: 0x128
// 0x2F6: 0xE5
// 0x2F7: 0xE5
// 0x2F8: 0xE5
// 0x2F9: 0x129
// 0x2FA: 0x129
// 0x2FB: 0x12A
// 0x2FC: 0x12B
// 0x2FD: 0x46
// 0x2FE: 0x12C
// 0x2FF: 0x12C
// 0x300: 0x12C
// 0x301: 0x12C
// 0x302: 0x12C
// 0x303: 0x12C
// 0x304: 0x12C
// 0x305: 0x12D
// 0x306: 0x12E
// 0x307: 0x103
// 0x308: 0x6D
// 0x309: 0x6D
// 0x30A: 0x6E
// 0x30B: 0x162
// 0x30C: 0x12F
// 0x30D: 0x69
// 0x30E: 0x6D
// 0x30F: 0x88
// 0x310: 0x88
// 0x311: 0x88
// 0x312: 0x130
// 0x313: 0x95
// 0x314: 0x88
// 0x315: 0x116
// 0x316: 0x69
// 0x317: 0x69
// 0x318: 0x131
// 0x319: 0xD8
// 0x31A: 0xA0
// 0x31B: 0xA0
// 0x31C: 0x132
// 0x31D: 0x9F
// 0x31E: 0x130
// 0x31F: 0x133
// 0x320: 0x132
// 0x321: 0x9C
// 0x322: 0x9F
// 0x323: 0x134
// 0x324: 0x134
// 0x325: 0x134
// 0x326: 0xC2
// 0x327: 0x71
// 0x328: 0x135
// 0x329: 0x136
// 0x32A: 0x69
// 0x32B: 0x137
// 0x32C: 0x6D
// 0x32D: 0x164
// 0x32E: 0x132
// 0x32F: 0xD6
// 0x330: 0x69
// 0x331: 0x138
// 0x332: 0x138
// 0x333: 0xC2
// 0x334: 0xD2
// 0x335: 0x139
// 0x336: 0x13A
// 0x337: 0x13B
// 0x338: 0x13A
// 0x339: 0x13C
// 0x33A: 0x13C
// 0x33B: 0x12E
// 0x33C: 0x13D
// 0x33D: 0x13D
// 0x33E: 0x13D
// 0x33F: 0x13E
// 0x340: 0x13E
// 0x341: 0x13E
// 0x342: 0x130
// 0x343: 0x108
// 0x344: 0x116
// 0x345: 0x13F
// 0x346: 0x13F
// 0x347: 0x140
// 0x348: 0x143
// 0x349: 0x143
// 0x34A: 0x143
// 0x34B: 0x143
// 0x34C: 0x12E
// 0x34D: 0x141
// 0x34E: 0x69
// 0x34F: 0x3D
// 0x350: 0x12D
// 0x351: 0x142
// 0x352: 0x8C
// 0x353: 0x8C
// 0x354: 0x8C
// 0x355: 0x8C
// 0x356: 0x8C
// 0x357: 0x8C
// 0x358: 0x8C
// 0x359: 0xEA
// 0x35A: 0xCB
// 0x35B: 0x143
// 0x35C: 0x144
// 0x35D: 0x145
// 0x35E: 0xE2
// 0x35F: 0x144
// 0x360: 0x146
// 0x361: 0x147
// 0x362: 0x108
// 0x363: 0xDD
// 0x364: 0x148
// 0x365: 0xA4
// 0x366: 0xA4
// 0x367: 0xA4
// 0x368: 0x149
// 0x369: 0x149
// 0x36A: 0x14A
// 0x36B: 0x14A
// 0x36C: 0x14A
// 0x36D: 0x14A
// 0x36E: 0x14A
// 0x36F: 0x14A
// 0x370: 0x14A
// 0x371: 0x14A
// 0x372: 0x14A
// 0x373: 0x14A
// 0x374: 0x14A
// 0x375: 0x14A
// 0x376: 0x14A
// 0x377: 0x14A
// 0x378: 0x14A
// 0x379: 0x14A
// 0x37A: 0x14A
// 0x37B: 0x14A
// 0x37C: 0x14A
// 0x37D: 0x14A
// 0x37E: 0x14A
// 0x37F: 0x14A
// 0x380: 0x14A
// 0x381: 0x14A
// 0x382: 0x14B
// 0x383: 0x14B
// 0x384: 0x14B
// 0x385: 0x14B
// 0x386: 0x14B
// 0x387: 0x14B
// 0x388: 0x14B
// 0x389: 0x14B
// 0x38A: 0x14B
// 0x38B: 0x14B
// 0x38C: 0x14B
// 0x38D: 0x14B
// 0x38E: 0x14B
// 0x38F: 0x14B
// 0x390: 0x14B
// 0x391: 0x14B
// 0x392: 0x14B
// 0x393: 0x14B
// 0x394: 0x14B
// 0x395: 0x14B
// 0x396: 0x14B
// 0x397: 0x14E
// 0x398: 0x14E
// 0x399: 0x14E
// 0x39A: 0x14E
// 0x39B: 0x14E
// 0x39C: 0x14E
// 0x39D: 0x14E
// 0x39E: 0x14E
// 0x39F: 0x14E
// 0x3A0: 0x14E
// 0x3A1: 0x14E
// 0x3A2: 0x14E
// 0x3A3: 0x14E
// 0x3A4: 0x14E
// 0x3A5: 0x14E
// 0x3A6: 0x14E
// 0x3A7: 0x14E
// 0x3A8: 0x14E
// 0x3A9: 0x14E
// 0x3AA: 0x14E
// 0x3AB: 0x14E
// 0x3AC: 0x14E
// 0x3AD: 0x14E
// 0x3AE: 0x14E
// 0x3AF: 0x14F
// 0x3B0: 0x14E
// 0x3B1: 0x14A
// 0x3B2: 0x14A
// 0x3B3: 0x14A
// 0x3B4: 0x14A
// 0x3B5: 0x14A
// 0x3B6: 0x14A
// 0x3B7: 0x14A
// 0x3B8: 0x14A
// 0x3B9: 0x14A
// 0x3BA: 0x14A
// 0x3BB: 0x14A
// 0x3BC: 0x14A
// 0x3BD: 0x14A
// 0x3BE: 0x14A
// 0x3BF: 0x14A
// 0x3C0: 0x14A
// 0x3C1: 0x14A
// 0x3C2: 0x14A
// 0x3C3: 0x14A
// 0x3C4: 0x14A
// 0x3C5: 0x14A
// 0x3C6: 0x14A
// 0x3C7: 0x14A
// 0x3C8: 0x14B
// 0x3C9: 0x14B
// 0x3CA: 0x14B
// 0x3CB: 0x14B
// 0x3CC: 0x14B
// 0x3CD: 0x14B
// 0x3CE: 0x14B
// 0x3CF: 0x14B
// 0x3D0: 0x14B
// 0x3D1: 0x14D
// 0x3D2: 0x14D
// 0x3D3: 0x14D
// 0x3D4: 0x14D
// 0x3D5: 0x14D
// 0x3D6: 0x14D
// 0x3D7: 0x14D
// 0x3D8: 0x14E
// 0x3D9: 0x14E
// 0x3DA: 0x14E
// 0x3DB: 0x14E
// 0x3DC: 0x14E
// 0x3DD: 0x14E
// 0x3DE: 0x14E
// 0x3DF: 0x14E
// 0x3E0: 0x14E
// 0x3E1: 0x14F
// 0x3E2: 0x14E
// 0x3E3: 0x14E
// 0x3E4: 0x14E
// 0x3E5: 0x14F
// 0x3E6: 0x14E
// 0x3E7: 0x14E
// 0x3E8: 0x14E
// 0x3E9: 0x14A
// 0x3EA: 0x14A
// 0x3EB: 0x14A
// 0x3EC: 0x14A
// 0x3ED: 0x14A
// 0x3EE: 0x14A
// 0x3EF: 0x14A
// 0x3F0: 0x14A
// 0x3F1: 0x14A
// 0x3F2: 0x14A
// 0x3F3: 0x14A
// 0x3F4: 0x14A
// 0x3F5: 0x14A
// 0x3F6: 0x14A
// 0x3F7: 0x14A
// 0x3F8: 0x14A
// 0x3F9: 0x14A
// 0x3FA: 0x14C
// 0x3FB: 0x14C
// 0x3FC: 0x14C
// 0x3FD: 0x14C
// 0x3FE: 0x14C
// 0x3FF: 0x14C
// 0x400: 0x14C
// 0x401: 0x14C
// 0x402: 0x14C
// 0x403: 0x14C
// 0x404: 0x14C
// 0x405: 0x14C
// 0x406: 0x14C
// 0x407: 0x14C
// 0x408: 0x14C
// 0x409: 0x14E
// 0x40A: 0x14E
// 0x40B: 0x14E
// 0x40C: 0x14E
// 0x40D: 0x14E
// 0x40E: 0x14E
// 0x40F: 0x14E
// 0x410: 0x14E
// 0x411: 0x14E
// 0x412: 0x14F
// 0x413: 0x14E
// 0x414: 0x14E
// 0x415: 0x14E
// 0x416: 0x14E
// 0x417: 0x14E
// 0x418: 0x14E
// 0x419: 0x14F
// 0x41A: 0x150
// 0x41B: 0x151
// 0x41C: 0x152
// 0x41D: 0x153
// 0x41E: 0x154
// 0x41F: 0x155
// 0x420: 0x156
// 0x421: 0x157
// 0x422: 0x158
// 0x423: 0x159
// 0x424: 0x15A
// 0x425: 0x15B
// 0x426: 0x15C
// 0x427: 0x15D
// 0x428: 0x15E
// 0x429: 0x15F
// 0x42A: 0x160
// 0x42B: 0x161
// 0x42C: 0x162
// 0x42D: 0x162
// 0x42E: 0x163
// 0x42F: 0x163
// 0x430: 0x164
// 0x431: 0x164
// 0x432: 0x165
// 0x433: 0x165
// 0x434: 0x166
// 0x435: 0x167
// 0x436: 0x167
// 0x437: 0x168
// 0x438: 0x169
// 0x439: 0x169
// 0x43A: 0x16A
// 0x43B: 0x16B
// 0x43C: 0x16B
// 0x43D: 0x16C
// 0x43E: 0x16C
// 0x43F: 0x16D
// 0x440: 0x16D
// 0x441: 0x16E
// 0x442: 0x16F
// 0x443: 0x16F
// 0x444: 0x174
// 0x445: 0x17B
// 0x446: 0x17E
// 0x447: 0x184
// 0x448: 0x180
// 0x449: 0x170
// 0x44A: 0x170
// 0x44B: 0x175
// 0x44C: 0x17A
// 0x44D: 0x17F
// 0x44E: 0x185
// 0x44F: 0x181
// 0x450: 0x171
// 0x451: 0x171
// 0x452: 0x176
// 0x453: 0x179
// 0x454: 0x17D
// 0x455: 0x184
// 0x456: 0x180
// 0x457: 0x172
// 0x458: 0x172
// 0x459: 0x177
// 0x45A: 0x17B
// 0x45B: 0x17E
// 0x45C: 0x186
// 0x45D: 0x182
// 0x45E: 0x173
// 0x45F: 0x173
// 0x460: 0x178
// 0x461: 0x17C
// 0x462: 0x17F
// 0x463: 0x187
// 0x464: 0x183
// 0x465: 0x188
// 0x466: 0x189
// 0x467: 0x18A
// 0x468: 0x18B
// 0x469: 0x18C
// 0x46A: 0x18D
// 0x46B: 0x18E
// 0x46C: 0x18F
// 0x46D: 0x190
// 0x46E: 0x190
// 0x46F: 0x191
// 0x470: 0x192
// 0x471: 0x193
// 0x472: 0x194
// 0x473: 0x195
// 0x474: 0x196
// 0x475: 0x197
// 0x476: 0x196
// 0x477: 0x197
// 0x478: 0x198
// 0x479: 0x199
// 0x47A: 0x19A
// 0x47B: 0x55
// 0x47C: 0x55
// 0x47D: 0x55
// 0x47E: 0x55
// 0x47F: 0x55
// 0x480: 0x55
// 0x481: 0x55
// 0x482: 0x55
// 0x483: 0x55
// 0x484: 0x55
// 0x485: 0x55
// 0x486: 0x55
// 0x487: 0x55
// 0x488: 0x55
// 0x489: 0x55
// 0x48A: 0x55
// 0x48B: 0x55
// 0x48C: 0x55
// 0x48D: 0x55
// 0x48E: 0x55
// 0x48F: 0x55
// 0x490: 0x55
// 0x491: 0x55
// 0x492: 0x55
// 0x493: 0x55
// 0x494: 0x55
// 0x495: 0x55
// 0x496: 0x55
// 0x497: 0x55
// 0x498: 0x55
// 0x499: 0x55
// 0x49A: 0x55
// 0x49B: 0x55
// 0x49C: 0x55
// 0x49D: 0x55
// 0x49E: 0x55
// 0x49F: 0x55
// 0x4A0: 0x55
// 0x4A1: 0x55
// 0x4A2: 0x55
// 0x4A3: 0x55
// 0x4A4: 0x55
// 0x4A5: 0x55
// 0x4A6: 0x55
// 0x4A7: 0x55
// 0x4A8: 0x55
// 0x4A9: 0x55
// 0x4AA: 0x55
// 0x4AB: 0x55
// 0x4AC: 0x55
// 0x4AD: 0x55
