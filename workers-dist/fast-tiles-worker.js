;(function() {
  var read = function(buffer, offset, isLE, mLen, nBytes) {
    var e, m
    var eLen = nBytes * 8 - mLen - 1
    var eMax = (1 << eLen) - 1
    var eBias = eMax >> 1
    var nBits = -7
    var i = isLE ? nBytes - 1 : 0
    var d = isLE ? -1 : 1
    var s = buffer[offset + i]

    i += d

    e = s & ((1 << -nBits) - 1)
    s >>= -nBits
    nBits += eLen
    for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    m = e & ((1 << -nBits) - 1)
    e >>= -nBits
    nBits += mLen
    for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

    if (e === 0) {
      e = 1 - eBias
    } else if (e === eMax) {
      return m ? NaN : (s ? -1 : 1) * Infinity
    } else {
      m = m + Math.pow(2, mLen)
      e = e - eBias
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
  }

  var write = function(buffer, value, offset, isLE, mLen, nBytes) {
    var e, m, c
    var eLen = nBytes * 8 - mLen - 1
    var eMax = (1 << eLen) - 1
    var eBias = eMax >> 1
    var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0
    var i = isLE ? 0 : nBytes - 1
    var d = isLE ? 1 : -1
    var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

    value = Math.abs(value)

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0
      e = eMax
    } else {
      e = Math.floor(Math.log(value) / Math.LN2)
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--
        c *= 2
      }
      if (e + eBias >= 1) {
        value += rt / c
      } else {
        value += rt * Math.pow(2, 1 - eBias)
      }
      if (value * c >= 2) {
        e++
        c /= 2
      }

      if (e + eBias >= eMax) {
        m = 0
        e = eMax
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * Math.pow(2, mLen)
        e = e + eBias
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
        e = 0
      }
    }

    for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

    e = (e << mLen) | m
    eLen += mLen
    for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

    buffer[offset + i - d] |= s * 128
  }

  var ieee754 = {
    read: read,
    write: write,
  }

  var pbf = Pbf

  function Pbf(buf) {
    this.buf = ArrayBuffer.isView && ArrayBuffer.isView(buf) ? buf : new Uint8Array(buf || 0)
    this.pos = 0
    this.type = 0
    this.length = this.buf.length
  }

  Pbf.Varint = 0 // varint: int32, int64, uint32, uint64, sint32, sint64, bool, enum
  Pbf.Fixed64 = 1 // 64-bit: double, fixed64, sfixed64
  Pbf.Bytes = 2 // length-delimited: string, bytes, embedded messages, packed repeated fields
  Pbf.Fixed32 = 5 // 32-bit: float, fixed32, sfixed32

  var SHIFT_LEFT_32 = (1 << 16) * (1 << 16),
    SHIFT_RIGHT_32 = 1 / SHIFT_LEFT_32

  // Threshold chosen based on both benchmarking and knowledge about browser string
  // data structures (which currently switch structure types at 12 bytes or more)
  var TEXT_DECODER_MIN_LENGTH = 12
  var utf8TextDecoder = typeof TextDecoder === 'undefined' ? null : new TextDecoder('utf8')

  Pbf.prototype = {
    destroy: function() {
      this.buf = null
    },

    // === READING =================================================================

    readFields: function(readField, result, end) {
      end = end || this.length

      while (this.pos < end) {
        var val = this.readVarint(),
          tag = val >> 3,
          startPos = this.pos

        this.type = val & 0x7
        readField(tag, result, this)

        if (this.pos === startPos) this.skip(val)
      }
      return result
    },

    readMessage: function(readField, result) {
      return this.readFields(readField, result, this.readVarint() + this.pos)
    },

    readFixed32: function() {
      var val = readUInt32(this.buf, this.pos)
      this.pos += 4
      return val
    },

    readSFixed32: function() {
      var val = readInt32(this.buf, this.pos)
      this.pos += 4
      return val
    },

    // 64-bit int handling is based on github.com/dpw/node-buffer-more-ints (MIT-licensed)

    readFixed64: function() {
      var val = readUInt32(this.buf, this.pos) + readUInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32
      this.pos += 8
      return val
    },

    readSFixed64: function() {
      var val = readUInt32(this.buf, this.pos) + readInt32(this.buf, this.pos + 4) * SHIFT_LEFT_32
      this.pos += 8
      return val
    },

    readFloat: function() {
      var val = ieee754.read(this.buf, this.pos, true, 23, 4)
      this.pos += 4
      return val
    },

    readDouble: function() {
      var val = ieee754.read(this.buf, this.pos, true, 52, 8)
      this.pos += 8
      return val
    },

    readVarint: function(isSigned) {
      var buf = this.buf,
        val,
        b

      b = buf[this.pos++]
      val = b & 0x7f
      if (b < 0x80) return val
      b = buf[this.pos++]
      val |= (b & 0x7f) << 7
      if (b < 0x80) return val
      b = buf[this.pos++]
      val |= (b & 0x7f) << 14
      if (b < 0x80) return val
      b = buf[this.pos++]
      val |= (b & 0x7f) << 21
      if (b < 0x80) return val
      b = buf[this.pos]
      val |= (b & 0x0f) << 28

      return readVarintRemainder(val, isSigned, this)
    },

    readVarint64: function() {
      // for compatibility with v2.0.1
      return this.readVarint(true)
    },

    readSVarint: function() {
      var num = this.readVarint()
      return num % 2 === 1 ? (num + 1) / -2 : num / 2 // zigzag encoding
    },

    readBoolean: function() {
      return Boolean(this.readVarint())
    },

    readString: function() {
      var end = this.readVarint() + this.pos
      var pos = this.pos
      this.pos = end

      if (end - pos >= TEXT_DECODER_MIN_LENGTH && utf8TextDecoder) {
        // longer strings are fast with the built-in browser TextDecoder API
        return readUtf8TextDecoder(this.buf, pos, end)
      }
      // short strings are fast with our custom implementation
      return readUtf8(this.buf, pos, end)
    },

    readBytes: function() {
      var end = this.readVarint() + this.pos,
        buffer = this.buf.subarray(this.pos, end)
      this.pos = end
      return buffer
    },

    // verbose for performance reasons; doesn't affect gzipped size

    readPackedVarint: function(arr, isSigned) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readVarint(isSigned))
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readVarint(isSigned))
      return arr
    },
    readPackedSVarint: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readSVarint())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readSVarint())
      return arr
    },
    readPackedBoolean: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readBoolean())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readBoolean())
      return arr
    },
    readPackedFloat: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readFloat())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readFloat())
      return arr
    },
    readPackedDouble: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readDouble())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readDouble())
      return arr
    },
    readPackedFixed32: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readFixed32())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readFixed32())
      return arr
    },
    readPackedSFixed32: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed32())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readSFixed32())
      return arr
    },
    readPackedFixed64: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readFixed64())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readFixed64())
      return arr
    },
    readPackedSFixed64: function(arr) {
      if (this.type !== Pbf.Bytes) return arr.push(this.readSFixed64())
      var end = readPackedEnd(this)
      arr = arr || []
      while (this.pos < end) arr.push(this.readSFixed64())
      return arr
    },

    skip: function(val) {
      var type = val & 0x7
      if (type === Pbf.Varint) while (this.buf[this.pos++] > 0x7f) {}
      else if (type === Pbf.Bytes) this.pos = this.readVarint() + this.pos
      else if (type === Pbf.Fixed32) this.pos += 4
      else if (type === Pbf.Fixed64) this.pos += 8
      else throw new Error('Unimplemented type: ' + type)
    },

    // === WRITING =================================================================

    writeTag: function(tag, type) {
      this.writeVarint((tag << 3) | type)
    },

    realloc: function(min) {
      var length = this.length || 16

      while (length < this.pos + min) length *= 2

      if (length !== this.length) {
        var buf = new Uint8Array(length)
        buf.set(this.buf)
        this.buf = buf
        this.length = length
      }
    },

    finish: function() {
      this.length = this.pos
      this.pos = 0
      return this.buf.subarray(0, this.length)
    },

    writeFixed32: function(val) {
      this.realloc(4)
      writeInt32(this.buf, val, this.pos)
      this.pos += 4
    },

    writeSFixed32: function(val) {
      this.realloc(4)
      writeInt32(this.buf, val, this.pos)
      this.pos += 4
    },

    writeFixed64: function(val) {
      this.realloc(8)
      writeInt32(this.buf, val & -1, this.pos)
      writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4)
      this.pos += 8
    },

    writeSFixed64: function(val) {
      this.realloc(8)
      writeInt32(this.buf, val & -1, this.pos)
      writeInt32(this.buf, Math.floor(val * SHIFT_RIGHT_32), this.pos + 4)
      this.pos += 8
    },

    writeVarint: function(val) {
      val = +val || 0

      if (val > 0xfffffff || val < 0) {
        writeBigVarint(val, this)
        return
      }

      this.realloc(4)

      this.buf[this.pos++] = (val & 0x7f) | (val > 0x7f ? 0x80 : 0)
      if (val <= 0x7f) return
      this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0)
      if (val <= 0x7f) return
      this.buf[this.pos++] = ((val >>>= 7) & 0x7f) | (val > 0x7f ? 0x80 : 0)
      if (val <= 0x7f) return
      this.buf[this.pos++] = (val >>> 7) & 0x7f
    },

    writeSVarint: function(val) {
      this.writeVarint(val < 0 ? -val * 2 - 1 : val * 2)
    },

    writeBoolean: function(val) {
      this.writeVarint(Boolean(val))
    },

    writeString: function(str) {
      str = String(str)
      this.realloc(str.length * 4)

      this.pos++ // reserve 1 byte for short string length

      var startPos = this.pos
      // write the string directly to the buffer and see how much was written
      this.pos = writeUtf8(this.buf, str, this.pos)
      var len = this.pos - startPos

      if (len >= 0x80) makeRoomForExtraLength(startPos, len, this)

      // finally, write the message length in the reserved place and restore the position
      this.pos = startPos - 1
      this.writeVarint(len)
      this.pos += len
    },

    writeFloat: function(val) {
      this.realloc(4)
      ieee754.write(this.buf, val, this.pos, true, 23, 4)
      this.pos += 4
    },

    writeDouble: function(val) {
      this.realloc(8)
      ieee754.write(this.buf, val, this.pos, true, 52, 8)
      this.pos += 8
    },

    writeBytes: function(buffer) {
      var len = buffer.length
      this.writeVarint(len)
      this.realloc(len)
      for (var i = 0; i < len; i++) this.buf[this.pos++] = buffer[i]
    },

    writeRawMessage: function(fn, obj) {
      this.pos++ // reserve 1 byte for short message length

      // write the message directly to the buffer and see how much was written
      var startPos = this.pos
      fn(obj, this)
      var len = this.pos - startPos

      if (len >= 0x80) makeRoomForExtraLength(startPos, len, this)

      // finally, write the message length in the reserved place and restore the position
      this.pos = startPos - 1
      this.writeVarint(len)
      this.pos += len
    },

    writeMessage: function(tag, fn, obj) {
      this.writeTag(tag, Pbf.Bytes)
      this.writeRawMessage(fn, obj)
    },

    writePackedVarint: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedVarint, arr)
    },
    writePackedSVarint: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedSVarint, arr)
    },
    writePackedBoolean: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedBoolean, arr)
    },
    writePackedFloat: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedFloat, arr)
    },
    writePackedDouble: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedDouble, arr)
    },
    writePackedFixed32: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedFixed32, arr)
    },
    writePackedSFixed32: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedSFixed32, arr)
    },
    writePackedFixed64: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedFixed64, arr)
    },
    writePackedSFixed64: function(tag, arr) {
      if (arr.length) this.writeMessage(tag, writePackedSFixed64, arr)
    },

    writeBytesField: function(tag, buffer) {
      this.writeTag(tag, Pbf.Bytes)
      this.writeBytes(buffer)
    },
    writeFixed32Field: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed32)
      this.writeFixed32(val)
    },
    writeSFixed32Field: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed32)
      this.writeSFixed32(val)
    },
    writeFixed64Field: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed64)
      this.writeFixed64(val)
    },
    writeSFixed64Field: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed64)
      this.writeSFixed64(val)
    },
    writeVarintField: function(tag, val) {
      this.writeTag(tag, Pbf.Varint)
      this.writeVarint(val)
    },
    writeSVarintField: function(tag, val) {
      this.writeTag(tag, Pbf.Varint)
      this.writeSVarint(val)
    },
    writeStringField: function(tag, str) {
      this.writeTag(tag, Pbf.Bytes)
      this.writeString(str)
    },
    writeFloatField: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed32)
      this.writeFloat(val)
    },
    writeDoubleField: function(tag, val) {
      this.writeTag(tag, Pbf.Fixed64)
      this.writeDouble(val)
    },
    writeBooleanField: function(tag, val) {
      this.writeVarintField(tag, Boolean(val))
    },
  }

  function readVarintRemainder(l, s, p) {
    var buf = p.buf,
      h,
      b

    b = buf[p.pos++]
    h = (b & 0x70) >> 4
    if (b < 0x80) return toNum(l, h, s)
    b = buf[p.pos++]
    h |= (b & 0x7f) << 3
    if (b < 0x80) return toNum(l, h, s)
    b = buf[p.pos++]
    h |= (b & 0x7f) << 10
    if (b < 0x80) return toNum(l, h, s)
    b = buf[p.pos++]
    h |= (b & 0x7f) << 17
    if (b < 0x80) return toNum(l, h, s)
    b = buf[p.pos++]
    h |= (b & 0x7f) << 24
    if (b < 0x80) return toNum(l, h, s)
    b = buf[p.pos++]
    h |= (b & 0x01) << 31
    if (b < 0x80) return toNum(l, h, s)

    throw new Error('Expected varint not more than 10 bytes')
  }

  function readPackedEnd(pbf) {
    return pbf.type === Pbf.Bytes ? pbf.readVarint() + pbf.pos : pbf.pos + 1
  }

  function toNum(low, high, isSigned) {
    if (isSigned) {
      return high * 0x100000000 + (low >>> 0)
    }

    return (high >>> 0) * 0x100000000 + (low >>> 0)
  }

  function writeBigVarint(val, pbf) {
    var low, high

    if (val >= 0) {
      low = val % 0x100000000 | 0
      high = (val / 0x100000000) | 0
    } else {
      low = ~(-val % 0x100000000)
      high = ~(-val / 0x100000000)

      if (low ^ 0xffffffff) {
        low = (low + 1) | 0
      } else {
        low = 0
        high = (high + 1) | 0
      }
    }

    if (val >= 0x10000000000000000 || val < -0x10000000000000000) {
      throw new Error("Given varint doesn't fit into 10 bytes")
    }

    pbf.realloc(10)

    writeBigVarintLow(low, high, pbf)
    writeBigVarintHigh(high, pbf)
  }

  function writeBigVarintLow(low, high, pbf) {
    pbf.buf[pbf.pos++] = (low & 0x7f) | 0x80
    low >>>= 7
    pbf.buf[pbf.pos++] = (low & 0x7f) | 0x80
    low >>>= 7
    pbf.buf[pbf.pos++] = (low & 0x7f) | 0x80
    low >>>= 7
    pbf.buf[pbf.pos++] = (low & 0x7f) | 0x80
    low >>>= 7
    pbf.buf[pbf.pos] = low & 0x7f
  }

  function writeBigVarintHigh(high, pbf) {
    var lsb = (high & 0x07) << 4

    pbf.buf[pbf.pos++] |= lsb | ((high >>>= 3) ? 0x80 : 0)
    if (!high) return
    pbf.buf[pbf.pos++] = (high & 0x7f) | ((high >>>= 7) ? 0x80 : 0)
    if (!high) return
    pbf.buf[pbf.pos++] = (high & 0x7f) | ((high >>>= 7) ? 0x80 : 0)
    if (!high) return
    pbf.buf[pbf.pos++] = (high & 0x7f) | ((high >>>= 7) ? 0x80 : 0)
    if (!high) return
    pbf.buf[pbf.pos++] = (high & 0x7f) | ((high >>>= 7) ? 0x80 : 0)
    if (!high) return
    pbf.buf[pbf.pos++] = high & 0x7f
  }

  function makeRoomForExtraLength(startPos, len, pbf) {
    var extraLen =
      len <= 0x3fff
        ? 1
        : len <= 0x1fffff
        ? 2
        : len <= 0xfffffff
        ? 3
        : Math.floor(Math.log(len) / (Math.LN2 * 7))

    // if 1 byte isn't enough for encoding message length, shift the data to the right
    pbf.realloc(extraLen)
    for (var i = pbf.pos - 1; i >= startPos; i--) pbf.buf[i + extraLen] = pbf.buf[i]
  }

  function writePackedVarint(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeVarint(arr[i])
  }
  function writePackedSVarint(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeSVarint(arr[i])
  }
  function writePackedFloat(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeFloat(arr[i])
  }
  function writePackedDouble(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeDouble(arr[i])
  }
  function writePackedBoolean(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeBoolean(arr[i])
  }
  function writePackedFixed32(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeFixed32(arr[i])
  }
  function writePackedSFixed32(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeSFixed32(arr[i])
  }
  function writePackedFixed64(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeFixed64(arr[i])
  }
  function writePackedSFixed64(arr, pbf) {
    for (var i = 0; i < arr.length; i++) pbf.writeSFixed64(arr[i])
  }

  // Buffer code below from https://github.com/feross/buffer, MIT-licensed

  function readUInt32(buf, pos) {
    return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16)) + buf[pos + 3] * 0x1000000
  }

  function writeInt32(buf, val, pos) {
    buf[pos] = val
    buf[pos + 1] = val >>> 8
    buf[pos + 2] = val >>> 16
    buf[pos + 3] = val >>> 24
  }

  function readInt32(buf, pos) {
    return (buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16)) + (buf[pos + 3] << 24)
  }

  function readUtf8(buf, pos, end) {
    var str = ''
    var i = pos

    while (i < end) {
      var b0 = buf[i]
      var c = null // codepoint
      var bytesPerSequence = b0 > 0xef ? 4 : b0 > 0xdf ? 3 : b0 > 0xbf ? 2 : 1

      if (i + bytesPerSequence > end) break

      var b1, b2, b3

      if (bytesPerSequence === 1) {
        if (b0 < 0x80) {
          c = b0
        }
      } else if (bytesPerSequence === 2) {
        b1 = buf[i + 1]
        if ((b1 & 0xc0) === 0x80) {
          c = ((b0 & 0x1f) << 0x6) | (b1 & 0x3f)
          if (c <= 0x7f) {
            c = null
          }
        }
      } else if (bytesPerSequence === 3) {
        b1 = buf[i + 1]
        b2 = buf[i + 2]
        if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80) {
          c = ((b0 & 0xf) << 0xc) | ((b1 & 0x3f) << 0x6) | (b2 & 0x3f)
          if (c <= 0x7ff || (c >= 0xd800 && c <= 0xdfff)) {
            c = null
          }
        }
      } else if (bytesPerSequence === 4) {
        b1 = buf[i + 1]
        b2 = buf[i + 2]
        b3 = buf[i + 3]
        if ((b1 & 0xc0) === 0x80 && (b2 & 0xc0) === 0x80 && (b3 & 0xc0) === 0x80) {
          c = ((b0 & 0xf) << 0x12) | ((b1 & 0x3f) << 0xc) | ((b2 & 0x3f) << 0x6) | (b3 & 0x3f)
          if (c <= 0xffff || c >= 0x110000) {
            c = null
          }
        }
      }

      if (c === null) {
        c = 0xfffd
        bytesPerSequence = 1
      } else if (c > 0xffff) {
        c -= 0x10000
        str += String.fromCharCode(((c >>> 10) & 0x3ff) | 0xd800)
        c = 0xdc00 | (c & 0x3ff)
      }

      str += String.fromCharCode(c)
      i += bytesPerSequence
    }

    return str
  }

  function readUtf8TextDecoder(buf, pos, end) {
    return utf8TextDecoder.decode(buf.subarray(pos, end))
  }

  function writeUtf8(buf, str, pos) {
    for (var i = 0, c, lead; i < str.length; i++) {
      c = str.charCodeAt(i) // code point

      if (c > 0xd7ff && c < 0xe000) {
        if (lead) {
          if (c < 0xdc00) {
            buf[pos++] = 0xef
            buf[pos++] = 0xbf
            buf[pos++] = 0xbd
            lead = c
            continue
          } else {
            c = ((lead - 0xd800) << 10) | (c - 0xdc00) | 0x10000
            lead = null
          }
        } else {
          if (c > 0xdbff || i + 1 === str.length) {
            buf[pos++] = 0xef
            buf[pos++] = 0xbf
            buf[pos++] = 0xbd
          } else {
            lead = c
          }
          continue
        }
      } else if (lead) {
        buf[pos++] = 0xef
        buf[pos++] = 0xbf
        buf[pos++] = 0xbd
        lead = null
      }

      if (c < 0x80) {
        buf[pos++] = c
      } else {
        if (c < 0x800) {
          buf[pos++] = (c >> 0x6) | 0xc0
        } else {
          if (c < 0x10000) {
            buf[pos++] = (c >> 0xc) | 0xe0
          } else {
            buf[pos++] = (c >> 0x12) | 0xf0
            buf[pos++] = ((c >> 0xc) & 0x3f) | 0x80
          }
          buf[pos++] = ((c >> 0x6) & 0x3f) | 0x80
        }
        buf[pos++] = (c & 0x3f) | 0x80
      }
    }
    return pos
  }

  var pointGeometry = Point

  /**
   * A standalone point geometry with useful accessor, comparison, and
   * modification methods.
   *
   * @class Point
   * @param {Number} x the x-coordinate. this could be longitude or screen
   * pixels, or any other sort of unit.
   * @param {Number} y the y-coordinate. this could be latitude or screen
   * pixels, or any other sort of unit.
   * @example
   * var point = new Point(-77, 38);
   */
  function Point(x, y) {
    this.x = x
    this.y = y
  }

  Point.prototype = {
    /**
     * Clone this point, returning a new point that can be modified
     * without affecting the old one.
     * @return {Point} the clone
     */
    clone: function() {
      return new Point(this.x, this.y)
    },

    /**
     * Add this point's x & y coordinates to another point,
     * yielding a new point.
     * @param {Point} p the other point
     * @return {Point} output point
     */
    add: function(p) {
      return this.clone()._add(p)
    },

    /**
     * Subtract this point's x & y coordinates to from point,
     * yielding a new point.
     * @param {Point} p the other point
     * @return {Point} output point
     */
    sub: function(p) {
      return this.clone()._sub(p)
    },

    /**
     * Multiply this point's x & y coordinates by point,
     * yielding a new point.
     * @param {Point} p the other point
     * @return {Point} output point
     */
    multByPoint: function(p) {
      return this.clone()._multByPoint(p)
    },

    /**
     * Divide this point's x & y coordinates by point,
     * yielding a new point.
     * @param {Point} p the other point
     * @return {Point} output point
     */
    divByPoint: function(p) {
      return this.clone()._divByPoint(p)
    },

    /**
     * Multiply this point's x & y coordinates by a factor,
     * yielding a new point.
     * @param {Point} k factor
     * @return {Point} output point
     */
    mult: function(k) {
      return this.clone()._mult(k)
    },

    /**
     * Divide this point's x & y coordinates by a factor,
     * yielding a new point.
     * @param {Point} k factor
     * @return {Point} output point
     */
    div: function(k) {
      return this.clone()._div(k)
    },

    /**
     * Rotate this point around the 0, 0 origin by an angle a,
     * given in radians
     * @param {Number} a angle to rotate around, in radians
     * @return {Point} output point
     */
    rotate: function(a) {
      return this.clone()._rotate(a)
    },

    /**
     * Rotate this point around p point by an angle a,
     * given in radians
     * @param {Number} a angle to rotate around, in radians
     * @param {Point} p Point to rotate around
     * @return {Point} output point
     */
    rotateAround: function(a, p) {
      return this.clone()._rotateAround(a, p)
    },

    /**
     * Multiply this point by a 4x1 transformation matrix
     * @param {Array<Number>} m transformation matrix
     * @return {Point} output point
     */
    matMult: function(m) {
      return this.clone()._matMult(m)
    },

    /**
     * Calculate this point but as a unit vector from 0, 0, meaning
     * that the distance from the resulting point to the 0, 0
     * coordinate will be equal to 1 and the angle from the resulting
     * point to the 0, 0 coordinate will be the same as before.
     * @return {Point} unit vector point
     */
    unit: function() {
      return this.clone()._unit()
    },

    /**
     * Compute a perpendicular point, where the new y coordinate
     * is the old x coordinate and the new x coordinate is the old y
     * coordinate multiplied by -1
     * @return {Point} perpendicular point
     */
    perp: function() {
      return this.clone()._perp()
    },

    /**
     * Return a version of this point with the x & y coordinates
     * rounded to integers.
     * @return {Point} rounded point
     */
    round: function() {
      return this.clone()._round()
    },

    /**
     * Return the magitude of this point: this is the Euclidean
     * distance from the 0, 0 coordinate to this point's x and y
     * coordinates.
     * @return {Number} magnitude
     */
    mag: function() {
      return Math.sqrt(this.x * this.x + this.y * this.y)
    },

    /**
     * Judge whether this point is equal to another point, returning
     * true or false.
     * @param {Point} other the other point
     * @return {boolean} whether the points are equal
     */
    equals: function(other) {
      return this.x === other.x && this.y === other.y
    },

    /**
     * Calculate the distance from this point to another point
     * @param {Point} p the other point
     * @return {Number} distance
     */
    dist: function(p) {
      return Math.sqrt(this.distSqr(p))
    },

    /**
     * Calculate the distance from this point to another point,
     * without the square root step. Useful if you're comparing
     * relative distances.
     * @param {Point} p the other point
     * @return {Number} distance
     */
    distSqr: function(p) {
      var dx = p.x - this.x,
        dy = p.y - this.y
      return dx * dx + dy * dy
    },

    /**
     * Get the angle from the 0, 0 coordinate to this point, in radians
     * coordinates.
     * @return {Number} angle
     */
    angle: function() {
      return Math.atan2(this.y, this.x)
    },

    /**
     * Get the angle from this point to another point, in radians
     * @param {Point} b the other point
     * @return {Number} angle
     */
    angleTo: function(b) {
      return Math.atan2(this.y - b.y, this.x - b.x)
    },

    /**
     * Get the angle between this point and another point, in radians
     * @param {Point} b the other point
     * @return {Number} angle
     */
    angleWith: function(b) {
      return this.angleWithSep(b.x, b.y)
    },

    /*
     * Find the angle of the two vectors, solving the formula for
     * the cross product a x b = |a||b|sin(θ) for θ.
     * @param {Number} x the x-coordinate
     * @param {Number} y the y-coordinate
     * @return {Number} the angle in radians
     */
    angleWithSep: function(x, y) {
      return Math.atan2(this.x * y - this.y * x, this.x * x + this.y * y)
    },

    _matMult: function(m) {
      var x = m[0] * this.x + m[1] * this.y,
        y = m[2] * this.x + m[3] * this.y
      this.x = x
      this.y = y
      return this
    },

    _add: function(p) {
      this.x += p.x
      this.y += p.y
      return this
    },

    _sub: function(p) {
      this.x -= p.x
      this.y -= p.y
      return this
    },

    _mult: function(k) {
      this.x *= k
      this.y *= k
      return this
    },

    _div: function(k) {
      this.x /= k
      this.y /= k
      return this
    },

    _multByPoint: function(p) {
      this.x *= p.x
      this.y *= p.y
      return this
    },

    _divByPoint: function(p) {
      this.x /= p.x
      this.y /= p.y
      return this
    },

    _unit: function() {
      this._div(this.mag())
      return this
    },

    _perp: function() {
      var y = this.y
      this.y = this.x
      this.x = -y
      return this
    },

    _rotate: function(angle) {
      var cos = Math.cos(angle),
        sin = Math.sin(angle),
        x = cos * this.x - sin * this.y,
        y = sin * this.x + cos * this.y
      this.x = x
      this.y = y
      return this
    },

    _rotateAround: function(angle, p) {
      var cos = Math.cos(angle),
        sin = Math.sin(angle),
        x = p.x + cos * (this.x - p.x) - sin * (this.y - p.y),
        y = p.y + sin * (this.x - p.x) + cos * (this.y - p.y)
      this.x = x
      this.y = y
      return this
    },

    _round: function() {
      this.x = Math.round(this.x)
      this.y = Math.round(this.y)
      return this
    },
  }

  /**
   * Construct a point from an array if necessary, otherwise if the input
   * is already a Point, or an unknown type, return it unchanged
   * @param {Array<Number>|Point|*} a any kind of input value
   * @return {Point} constructed point, or passed-through value.
   * @example
   * // this
   * var point = Point.convert([0, 1]);
   * // is equivalent to
   * var point = new Point(0, 1);
   */
  Point.convert = function(a) {
    if (a instanceof Point) {
      return a
    }
    if (Array.isArray(a)) {
      return new Point(a[0], a[1])
    }
    return a
  }

  var vectortilefeature = VectorTileFeature

  function VectorTileFeature(pbf, end, extent, keys, values) {
    // Public
    this.properties = {}
    this.extent = extent
    this.type = 0

    // Private
    this._pbf = pbf
    this._geometry = -1
    this._keys = keys
    this._values = values

    pbf.readFields(readFeature, this, end)
  }

  function readFeature(tag, feature, pbf) {
    if (tag == 1) feature.id = pbf.readVarint()
    else if (tag == 2) readTag(pbf, feature)
    else if (tag == 3) feature.type = pbf.readVarint()
    else if (tag == 4) feature._geometry = pbf.pos
  }

  function readTag(pbf, feature) {
    var end = pbf.readVarint() + pbf.pos

    while (pbf.pos < end) {
      var key = feature._keys[pbf.readVarint()],
        value = feature._values[pbf.readVarint()]
      feature.properties[key] = value
    }
  }

  VectorTileFeature.types = ['Unknown', 'Point', 'LineString', 'Polygon']

  VectorTileFeature.prototype.loadGeometry = function() {
    var pbf = this._pbf
    pbf.pos = this._geometry

    var end = pbf.readVarint() + pbf.pos,
      cmd = 1,
      length = 0,
      x = 0,
      y = 0,
      lines = [],
      line

    while (pbf.pos < end) {
      if (length <= 0) {
        var cmdLen = pbf.readVarint()
        cmd = cmdLen & 0x7
        length = cmdLen >> 3
      }

      length--

      if (cmd === 1 || cmd === 2) {
        x += pbf.readSVarint()
        y += pbf.readSVarint()

        if (cmd === 1) {
          // moveTo
          if (line) lines.push(line)
          line = []
        }

        line.push(new pointGeometry(x, y))
      } else if (cmd === 7) {
        // Workaround for https://github.com/mapbox/mapnik-vector-tile/issues/90
        if (line) {
          line.push(line[0].clone()) // closePolygon
        }
      } else {
        throw new Error('unknown command ' + cmd)
      }
    }

    if (line) lines.push(line)

    return lines
  }

  VectorTileFeature.prototype.bbox = function() {
    var pbf = this._pbf
    pbf.pos = this._geometry

    var end = pbf.readVarint() + pbf.pos,
      cmd = 1,
      length = 0,
      x = 0,
      y = 0,
      x1 = Infinity,
      x2 = -Infinity,
      y1 = Infinity,
      y2 = -Infinity

    while (pbf.pos < end) {
      if (length <= 0) {
        var cmdLen = pbf.readVarint()
        cmd = cmdLen & 0x7
        length = cmdLen >> 3
      }

      length--

      if (cmd === 1 || cmd === 2) {
        x += pbf.readSVarint()
        y += pbf.readSVarint()
        if (x < x1) x1 = x
        if (x > x2) x2 = x
        if (y < y1) y1 = y
        if (y > y2) y2 = y
      } else if (cmd !== 7) {
        throw new Error('unknown command ' + cmd)
      }
    }

    return [x1, y1, x2, y2]
  }

  VectorTileFeature.prototype.toGeoJSON = function(x, y, z) {
    var size = this.extent * Math.pow(2, z),
      x0 = this.extent * x,
      y0 = this.extent * y,
      coords = this.loadGeometry(),
      type = VectorTileFeature.types[this.type],
      i,
      j

    function project(line) {
      for (var j = 0; j < line.length; j++) {
        var p = line[j],
          y2 = 180 - ((p.y + y0) * 360) / size
        line[j] = [
          ((p.x + x0) * 360) / size - 180,
          (360 / Math.PI) * Math.atan(Math.exp((y2 * Math.PI) / 180)) - 90,
        ]
      }
    }

    switch (this.type) {
      case 1:
        var points = []
        for (i = 0; i < coords.length; i++) {
          points[i] = coords[i][0]
        }
        coords = points
        project(coords)
        break

      case 2:
        for (i = 0; i < coords.length; i++) {
          project(coords[i])
        }
        break

      case 3:
        coords = classifyRings(coords)
        for (i = 0; i < coords.length; i++) {
          for (j = 0; j < coords[i].length; j++) {
            project(coords[i][j])
          }
        }
        break
    }

    if (coords.length === 1) {
      coords = coords[0]
    } else {
      type = 'Multi' + type
    }

    var result = {
      type: 'Feature',
      geometry: {
        type: type,
        coordinates: coords,
      },
      properties: this.properties,
    }

    if ('id' in this) {
      result.id = this.id
    }

    return result
  }

  // classifies an array of rings into polygons with outer rings and holes

  function classifyRings(rings) {
    var len = rings.length

    if (len <= 1) return [rings]

    var polygons = [],
      polygon,
      ccw

    for (var i = 0; i < len; i++) {
      var area = signedArea(rings[i])
      if (area === 0) continue

      if (ccw === undefined) ccw = area < 0

      if (ccw === area < 0) {
        if (polygon) polygons.push(polygon)
        polygon = [rings[i]]
      } else {
        polygon.push(rings[i])
      }
    }
    if (polygon) polygons.push(polygon)

    return polygons
  }

  function signedArea(ring) {
    var sum = 0
    for (var i = 0, len = ring.length, j = len - 1, p1, p2; i < len; j = i++) {
      p1 = ring[i]
      p2 = ring[j]
      sum += (p2.x - p1.x) * (p1.y + p2.y)
    }
    return sum
  }

  var vectortilelayer = VectorTileLayer

  function VectorTileLayer(pbf, end) {
    // Public
    this.version = 1
    this.name = null
    this.extent = 4096
    this.length = 0

    // Private
    this._pbf = pbf
    this._keys = []
    this._values = []
    this._features = []

    pbf.readFields(readLayer, this, end)

    this.length = this._features.length
  }

  function readLayer(tag, layer, pbf) {
    if (tag === 15) layer.version = pbf.readVarint()
    else if (tag === 1) layer.name = pbf.readString()
    else if (tag === 5) layer.extent = pbf.readVarint()
    else if (tag === 2) layer._features.push(pbf.pos)
    else if (tag === 3) layer._keys.push(pbf.readString())
    else if (tag === 4) layer._values.push(readValueMessage(pbf))
  }

  function readValueMessage(pbf) {
    var value = null,
      end = pbf.readVarint() + pbf.pos

    while (pbf.pos < end) {
      var tag = pbf.readVarint() >> 3

      value =
        tag === 1
          ? pbf.readString()
          : tag === 2
          ? pbf.readFloat()
          : tag === 3
          ? pbf.readDouble()
          : tag === 4
          ? pbf.readVarint64()
          : tag === 5
          ? pbf.readVarint()
          : tag === 6
          ? pbf.readSVarint()
          : tag === 7
          ? pbf.readBoolean()
          : null
    }

    return value
  }

  // return feature `i` from this layer as a `VectorTileFeature`
  VectorTileLayer.prototype.feature = function(i) {
    if (i < 0 || i >= this._features.length) throw new Error('feature index out of bounds')

    this._pbf.pos = this._features[i]

    var end = this._pbf.readVarint() + this._pbf.pos
    return new vectortilefeature(this._pbf, end, this.extent, this._keys, this._values)
  }

  var vectortile = VectorTile

  function VectorTile(pbf, end) {
    this.layers = pbf.readFields(readTile, {}, end)
  }

  function readTile(tag, layers, pbf) {
    if (tag === 3) {
      var layer = new vectortilelayer(pbf, pbf.readVarint() + pbf.pos)
      if (layer.length) layers[layer.name] = layer
    }
  }

  var VectorTile$1 = vectortile
  var VectorTileFeature$1 = vectortilefeature
  var VectorTileLayer$1 = vectortilelayer

  var vectorTile = {
    VectorTile: VectorTile$1,
    VectorTileFeature: VectorTileFeature$1,
    VectorTileLayer: VectorTileLayer$1,
  }

  var VectorTileFeature$2 = vectorTile.VectorTileFeature

  var geojson_wrapper = GeoJSONWrapper

  // conform to vectortile api
  function GeoJSONWrapper(features, options) {
    this.options = options || {}
    this.features = features
    this.length = features.length
  }

  GeoJSONWrapper.prototype.feature = function(i) {
    return new FeatureWrapper(this.features[i], this.options.extent)
  }

  function FeatureWrapper(feature, extent) {
    this.id = typeof feature.id === 'number' ? feature.id : undefined
    this.type = feature.type
    this.rawGeometry = feature.type === 1 ? [feature.geometry] : feature.geometry
    this.properties = feature.tags
    this.extent = extent || 4096
  }

  FeatureWrapper.prototype.loadGeometry = function() {
    var rings = this.rawGeometry
    this.geometry = []

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i]
      var newRing = []
      for (var j = 0; j < ring.length; j++) {
        newRing.push(new pointGeometry(ring[j][0], ring[j][1]))
      }
      this.geometry.push(newRing)
    }
    return this.geometry
  }

  FeatureWrapper.prototype.bbox = function() {
    if (!this.geometry) this.loadGeometry()

    var rings = this.geometry
    var x1 = Infinity
    var x2 = -Infinity
    var y1 = Infinity
    var y2 = -Infinity

    for (var i = 0; i < rings.length; i++) {
      var ring = rings[i]

      for (var j = 0; j < ring.length; j++) {
        var coord = ring[j]

        x1 = Math.min(x1, coord.x)
        x2 = Math.max(x2, coord.x)
        y1 = Math.min(y1, coord.y)
        y2 = Math.max(y2, coord.y)
      }
    }

    return [x1, y1, x2, y2]
  }

  FeatureWrapper.prototype.toGeoJSON = VectorTileFeature$2.prototype.toGeoJSON

  var vtPbf = fromVectorTileJs
  var fromVectorTileJs_1 = fromVectorTileJs
  var fromGeojsonVt_1 = fromGeojsonVt
  var GeoJSONWrapper_1 = geojson_wrapper

  /**
   * Serialize a vector-tile-js-created tile to pbf
   *
   * @param {Object} tile
   * @return {Buffer} uncompressed, pbf-serialized tile data
   */
  function fromVectorTileJs(tile) {
    var out = new pbf()
    writeTile(tile, out)
    return out.finish()
  }

  /**
   * Serialized a geojson-vt-created tile to pbf.
   *
   * @param {Object} layers - An object mapping layer names to geojson-vt-created vector tile objects
   * @param {Object} [options] - An object specifying the vector-tile specification version and extent that were used to create `layers`.
   * @param {Number} [options.version=1] - Version of vector-tile spec used
   * @param {Number} [options.extent=4096] - Extent of the vector tile
   * @return {Buffer} uncompressed, pbf-serialized tile data
   */
  function fromGeojsonVt(layers, options) {
    options = options || {}
    var l = {}
    for (var k in layers) {
      l[k] = new geojson_wrapper(layers[k].features, options)
      l[k].name = k
      l[k].version = options.version
      l[k].extent = options.extent
    }
    return fromVectorTileJs({ layers: l })
  }

  function writeTile(tile, pbf) {
    for (var key in tile.layers) {
      pbf.writeMessage(3, writeLayer, tile.layers[key])
    }
  }

  function writeLayer(layer, pbf) {
    pbf.writeVarintField(15, layer.version || 1)
    pbf.writeStringField(1, layer.name || '')
    pbf.writeVarintField(5, layer.extent || 4096)

    var i
    var context = {
      keys: [],
      values: [],
      keycache: {},
      valuecache: {},
    }

    for (i = 0; i < layer.length; i++) {
      context.feature = layer.feature(i)
      pbf.writeMessage(2, writeFeature, context)
    }

    var keys = context.keys
    for (i = 0; i < keys.length; i++) {
      pbf.writeStringField(3, keys[i])
    }

    var values = context.values
    for (i = 0; i < values.length; i++) {
      pbf.writeMessage(4, writeValue, values[i])
    }
  }

  function writeFeature(context, pbf) {
    var feature = context.feature

    if (feature.id !== undefined) {
      pbf.writeVarintField(1, feature.id)
    }

    pbf.writeMessage(2, writeProperties, context)
    pbf.writeVarintField(3, feature.type)
    pbf.writeMessage(4, writeGeometry, feature)
  }

  function writeProperties(context, pbf) {
    var feature = context.feature
    var keys = context.keys
    var values = context.values
    var keycache = context.keycache
    var valuecache = context.valuecache

    for (var key in feature.properties) {
      var keyIndex = keycache[key]
      if (typeof keyIndex === 'undefined') {
        keys.push(key)
        keyIndex = keys.length - 1
        keycache[key] = keyIndex
      }
      pbf.writeVarint(keyIndex)

      var value = feature.properties[key]
      var type = typeof value
      if (type !== 'string' && type !== 'boolean' && type !== 'number') {
        value = JSON.stringify(value)
      }
      var valueKey = type + ':' + value
      var valueIndex = valuecache[valueKey]
      if (typeof valueIndex === 'undefined') {
        values.push(value)
        valueIndex = values.length - 1
        valuecache[valueKey] = valueIndex
      }
      pbf.writeVarint(valueIndex)
    }
  }

  function command(cmd, length) {
    return (length << 3) + (cmd & 0x7)
  }

  function zigzag(num) {
    return (num << 1) ^ (num >> 31)
  }

  function writeGeometry(feature, pbf) {
    var geometry = feature.loadGeometry()
    var type = feature.type
    var x = 0
    var y = 0
    var rings = geometry.length
    for (var r = 0; r < rings; r++) {
      var ring = geometry[r]
      var count = 1
      if (type === 1) {
        count = ring.length
      }
      pbf.writeVarint(command(1, count)) // moveto
      // do not write polygon closing path as lineto
      var lineCount = type === 3 ? ring.length - 1 : ring.length
      for (var i = 0; i < lineCount; i++) {
        if (i === 1 && type !== 1) {
          pbf.writeVarint(command(2, lineCount - 1)) // lineto
        }
        var dx = ring[i].x - x
        var dy = ring[i].y - y
        pbf.writeVarint(zigzag(dx))
        pbf.writeVarint(zigzag(dy))
        x += dx
        y += dy
      }
      if (type === 3) {
        pbf.writeVarint(command(7, 1)) // closepath
      }
    }
  }

  function writeValue(value, pbf) {
    var type = typeof value
    if (type === 'string') {
      pbf.writeStringField(1, value)
    } else if (type === 'boolean') {
      pbf.writeBooleanField(7, value)
    } else if (type === 'number') {
      if (value % 1 !== 0) {
        pbf.writeDoubleField(3, value)
      } else if (value < 0) {
        pbf.writeSVarintField(6, value)
      } else {
        pbf.writeVarintField(5, value)
      }
    }
  }
  vtPbf.fromVectorTileJs = fromVectorTileJs_1
  vtPbf.fromGeojsonVt = fromGeojsonVt_1
  vtPbf.GeoJSONWrapper = GeoJSONWrapper_1

  // calculate simplification data using optimized Douglas-Peucker algorithm

  function simplify(coords, first, last, sqTolerance) {
    var maxSqDist = sqTolerance
    var mid = (last - first) >> 1
    var minPosToMid = last - first
    var index

    var ax = coords[first]
    var ay = coords[first + 1]
    var bx = coords[last]
    var by = coords[last + 1]

    for (var i = first + 3; i < last; i += 3) {
      var d = getSqSegDist(coords[i], coords[i + 1], ax, ay, bx, by)

      if (d > maxSqDist) {
        index = i
        maxSqDist = d
      } else if (d === maxSqDist) {
        // a workaround to ensure we choose a pivot close to the middle of the list,
        // reducing recursion depth, for certain degenerate inputs
        // https://github.com/mapbox/geojson-vt/issues/104
        var posToMid = Math.abs(i - mid)
        if (posToMid < minPosToMid) {
          index = i
          minPosToMid = posToMid
        }
      }
    }

    if (maxSqDist > sqTolerance) {
      if (index - first > 3) simplify(coords, first, index, sqTolerance)
      coords[index + 2] = maxSqDist
      if (last - index > 3) simplify(coords, index, last, sqTolerance)
    }
  }

  // square distance from a point to a segment
  function getSqSegDist(px, py, x, y, bx, by) {
    var dx = bx - x
    var dy = by - y

    if (dx !== 0 || dy !== 0) {
      var t = ((px - x) * dx + (py - y) * dy) / (dx * dx + dy * dy)

      if (t > 1) {
        x = bx
        y = by
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }

    dx = px - x
    dy = py - y

    return dx * dx + dy * dy
  }

  function createFeature(id, type, geom, tags) {
    var feature = {
      id: typeof id === 'undefined' ? null : id,
      type: type,
      geometry: geom,
      tags: tags,
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
    }
    calcBBox(feature)
    return feature
  }

  function calcBBox(feature) {
    var geom = feature.geometry
    var type = feature.type

    if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
      calcLineBBox(feature, geom)
    } else if (type === 'Polygon' || type === 'MultiLineString') {
      for (var i = 0; i < geom.length; i++) {
        calcLineBBox(feature, geom[i])
      }
    } else if (type === 'MultiPolygon') {
      for (i = 0; i < geom.length; i++) {
        for (var j = 0; j < geom[i].length; j++) {
          calcLineBBox(feature, geom[i][j])
        }
      }
    }
  }

  function calcLineBBox(feature, geom) {
    for (var i = 0; i < geom.length; i += 3) {
      feature.minX = Math.min(feature.minX, geom[i])
      feature.minY = Math.min(feature.minY, geom[i + 1])
      feature.maxX = Math.max(feature.maxX, geom[i])
      feature.maxY = Math.max(feature.maxY, geom[i + 1])
    }
  }

  // converts GeoJSON feature into an intermediate projected JSON vector format with simplification data

  function convert(data, options) {
    var features = []
    if (data.type === 'FeatureCollection') {
      for (var i = 0; i < data.features.length; i++) {
        convertFeature(features, data.features[i], options, i)
      }
    } else if (data.type === 'Feature') {
      convertFeature(features, data, options)
    } else {
      // single geometry or a geometry collection
      convertFeature(features, { geometry: data }, options)
    }

    return features
  }

  function convertFeature(features, geojson, options, index) {
    if (!geojson.geometry) return

    var coords = geojson.geometry.coordinates
    var type = geojson.geometry.type
    var tolerance = Math.pow(options.tolerance / ((1 << options.maxZoom) * options.extent), 2)
    var geometry = []
    var id = geojson.id
    if (options.promoteId) {
      id = geojson.properties[options.promoteId]
    } else if (options.generateId) {
      id = index || 0
    }
    if (type === 'Point') {
      convertPoint(coords, geometry)
    } else if (type === 'MultiPoint') {
      for (var i = 0; i < coords.length; i++) {
        convertPoint(coords[i], geometry)
      }
    } else if (type === 'LineString') {
      convertLine(coords, geometry, tolerance, false)
    } else if (type === 'MultiLineString') {
      if (options.lineMetrics) {
        // explode into linestrings to be able to track metrics
        for (i = 0; i < coords.length; i++) {
          geometry = []
          convertLine(coords[i], geometry, tolerance, false)
          features.push(createFeature(id, 'LineString', geometry, geojson.properties))
        }
        return
      } else {
        convertLines(coords, geometry, tolerance, false)
      }
    } else if (type === 'Polygon') {
      convertLines(coords, geometry, tolerance, true)
    } else if (type === 'MultiPolygon') {
      for (i = 0; i < coords.length; i++) {
        var polygon = []
        convertLines(coords[i], polygon, tolerance, true)
        geometry.push(polygon)
      }
    } else if (type === 'GeometryCollection') {
      for (i = 0; i < geojson.geometry.geometries.length; i++) {
        convertFeature(
          features,
          {
            id: id,
            geometry: geojson.geometry.geometries[i],
            properties: geojson.properties,
          },
          options,
          index
        )
      }
      return
    } else {
      throw new Error('Input data is not a valid GeoJSON object.')
    }

    features.push(createFeature(id, type, geometry, geojson.properties))
  }

  function convertPoint(coords, out) {
    out.push(projectX(coords[0]))
    out.push(projectY(coords[1]))
    out.push(0)
  }

  function convertLine(ring, out, tolerance, isPolygon) {
    var x0, y0
    var size = 0

    for (var j = 0; j < ring.length; j++) {
      var x = projectX(ring[j][0])
      var y = projectY(ring[j][1])

      out.push(x)
      out.push(y)
      out.push(0)

      if (j > 0) {
        if (isPolygon) {
          size += (x0 * y - x * y0) / 2 // area
        } else {
          size += Math.sqrt(Math.pow(x - x0, 2) + Math.pow(y - y0, 2)) // length
        }
      }
      x0 = x
      y0 = y
    }

    var last = out.length - 3
    out[2] = 1
    simplify(out, 0, last, tolerance)
    out[last + 2] = 1

    out.size = Math.abs(size)
    out.start = 0
    out.end = out.size
  }

  function convertLines(rings, out, tolerance, isPolygon) {
    for (var i = 0; i < rings.length; i++) {
      var geom = []
      convertLine(rings[i], geom, tolerance, isPolygon)
      out.push(geom)
    }
  }

  function projectX(x) {
    return x / 360 + 0.5
  }

  function projectY(y) {
    var sin = Math.sin((y * Math.PI) / 180)
    var y2 = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI
    return y2 < 0 ? 0 : y2 > 1 ? 1 : y2
  }

  /* clip features between two axis-parallel lines:
   *     |        |
   *  ___|___     |     /
   * /   |   \____|____/
   *     |        |
   */

  function clip(features, scale, k1, k2, axis, minAll, maxAll, options) {
    k1 /= scale
    k2 /= scale

    if (minAll >= k1 && maxAll < k2) return features
    // trivial accept
    else if (maxAll < k1 || minAll >= k2) return null // trivial reject

    var clipped = []

    for (var i = 0; i < features.length; i++) {
      var feature = features[i]
      var geometry = feature.geometry
      var type = feature.type

      var min = axis === 0 ? feature.minX : feature.minY
      var max = axis === 0 ? feature.maxX : feature.maxY

      if (min >= k1 && max < k2) {
        // trivial accept
        clipped.push(feature)
        continue
      } else if (max < k1 || min >= k2) {
        // trivial reject
        continue
      }

      var newGeometry = []

      if (type === 'Point' || type === 'MultiPoint') {
        clipPoints(geometry, newGeometry, k1, k2, axis)
      } else if (type === 'LineString') {
        clipLine(geometry, newGeometry, k1, k2, axis, false, options.lineMetrics)
      } else if (type === 'MultiLineString') {
        clipLines(geometry, newGeometry, k1, k2, axis, false)
      } else if (type === 'Polygon') {
        clipLines(geometry, newGeometry, k1, k2, axis, true)
      } else if (type === 'MultiPolygon') {
        for (var j = 0; j < geometry.length; j++) {
          var polygon = []
          clipLines(geometry[j], polygon, k1, k2, axis, true)
          if (polygon.length) {
            newGeometry.push(polygon)
          }
        }
      }

      if (newGeometry.length) {
        if (options.lineMetrics && type === 'LineString') {
          for (j = 0; j < newGeometry.length; j++) {
            clipped.push(createFeature(feature.id, type, newGeometry[j], feature.tags))
          }
          continue
        }

        if (type === 'LineString' || type === 'MultiLineString') {
          if (newGeometry.length === 1) {
            type = 'LineString'
            newGeometry = newGeometry[0]
          } else {
            type = 'MultiLineString'
          }
        }
        if (type === 'Point' || type === 'MultiPoint') {
          type = newGeometry.length === 3 ? 'Point' : 'MultiPoint'
        }

        clipped.push(createFeature(feature.id, type, newGeometry, feature.tags))
      }
    }

    return clipped.length ? clipped : null
  }

  function clipPoints(geom, newGeom, k1, k2, axis) {
    for (var i = 0; i < geom.length; i += 3) {
      var a = geom[i + axis]

      if (a >= k1 && a <= k2) {
        newGeom.push(geom[i])
        newGeom.push(geom[i + 1])
        newGeom.push(geom[i + 2])
      }
    }
  }

  function clipLine(geom, newGeom, k1, k2, axis, isPolygon, trackMetrics) {
    var slice = newSlice(geom)
    var intersect = axis === 0 ? intersectX : intersectY
    var len = geom.start
    var segLen, t

    for (var i = 0; i < geom.length - 3; i += 3) {
      var ax = geom[i]
      var ay = geom[i + 1]
      var az = geom[i + 2]
      var bx = geom[i + 3]
      var by = geom[i + 4]
      var a = axis === 0 ? ax : ay
      var b = axis === 0 ? bx : by
      var exited = false

      if (trackMetrics) segLen = Math.sqrt(Math.pow(ax - bx, 2) + Math.pow(ay - by, 2))

      if (a < k1) {
        // ---|-->  | (line enters the clip region from the left)
        if (b > k1) {
          t = intersect(slice, ax, ay, bx, by, k1)
          if (trackMetrics) slice.start = len + segLen * t
        }
      } else if (a > k2) {
        // |  <--|--- (line enters the clip region from the right)
        if (b < k2) {
          t = intersect(slice, ax, ay, bx, by, k2)
          if (trackMetrics) slice.start = len + segLen * t
        }
      } else {
        addPoint(slice, ax, ay, az)
      }
      if (b < k1 && a >= k1) {
        // <--|---  | or <--|-----|--- (line exits the clip region on the left)
        t = intersect(slice, ax, ay, bx, by, k1)
        exited = true
      }
      if (b > k2 && a <= k2) {
        // |  ---|--> or ---|-----|--> (line exits the clip region on the right)
        t = intersect(slice, ax, ay, bx, by, k2)
        exited = true
      }

      if (!isPolygon && exited) {
        if (trackMetrics) slice.end = len + segLen * t
        newGeom.push(slice)
        slice = newSlice(geom)
      }

      if (trackMetrics) len += segLen
    }

    // add the last point
    var last = geom.length - 3
    ax = geom[last]
    ay = geom[last + 1]
    az = geom[last + 2]
    a = axis === 0 ? ax : ay
    if (a >= k1 && a <= k2) addPoint(slice, ax, ay, az)

    // close the polygon if its endpoints are not the same after clipping
    last = slice.length - 3
    if (isPolygon && last >= 3 && (slice[last] !== slice[0] || slice[last + 1] !== slice[1])) {
      addPoint(slice, slice[0], slice[1], slice[2])
    }

    // add the final slice
    if (slice.length) {
      newGeom.push(slice)
    }
  }

  function newSlice(line) {
    var slice = []
    slice.size = line.size
    slice.start = line.start
    slice.end = line.end
    return slice
  }

  function clipLines(geom, newGeom, k1, k2, axis, isPolygon) {
    for (var i = 0; i < geom.length; i++) {
      clipLine(geom[i], newGeom, k1, k2, axis, isPolygon, false)
    }
  }

  function addPoint(out, x, y, z) {
    out.push(x)
    out.push(y)
    out.push(z)
  }

  function intersectX(out, ax, ay, bx, by, x) {
    var t = (x - ax) / (bx - ax)
    out.push(x)
    out.push(ay + (by - ay) * t)
    out.push(1)
    return t
  }

  function intersectY(out, ax, ay, bx, by, y) {
    var t = (y - ay) / (by - ay)
    out.push(ax + (bx - ax) * t)
    out.push(y)
    out.push(1)
    return t
  }

  function wrap(features, options) {
    var buffer = options.buffer / options.extent
    var merged = features
    var left = clip(features, 1, -1 - buffer, buffer, 0, -1, 2, options) // left world copy
    var right = clip(features, 1, 1 - buffer, 2 + buffer, 0, -1, 2, options) // right world copy

    if (left || right) {
      merged = clip(features, 1, -buffer, 1 + buffer, 0, -1, 2, options) || [] // center world copy

      if (left) merged = shiftFeatureCoords(left, 1).concat(merged) // merge left into center
      if (right) merged = merged.concat(shiftFeatureCoords(right, -1)) // merge right into center
    }

    return merged
  }

  function shiftFeatureCoords(features, offset) {
    var newFeatures = []

    for (var i = 0; i < features.length; i++) {
      var feature = features[i],
        type = feature.type

      var newGeometry

      if (type === 'Point' || type === 'MultiPoint' || type === 'LineString') {
        newGeometry = shiftCoords(feature.geometry, offset)
      } else if (type === 'MultiLineString' || type === 'Polygon') {
        newGeometry = []
        for (var j = 0; j < feature.geometry.length; j++) {
          newGeometry.push(shiftCoords(feature.geometry[j], offset))
        }
      } else if (type === 'MultiPolygon') {
        newGeometry = []
        for (j = 0; j < feature.geometry.length; j++) {
          var newPolygon = []
          for (var k = 0; k < feature.geometry[j].length; k++) {
            newPolygon.push(shiftCoords(feature.geometry[j][k], offset))
          }
          newGeometry.push(newPolygon)
        }
      }

      newFeatures.push(createFeature(feature.id, type, newGeometry, feature.tags))
    }

    return newFeatures
  }

  function shiftCoords(points, offset) {
    var newPoints = []
    newPoints.size = points.size

    if (points.start !== undefined) {
      newPoints.start = points.start
      newPoints.end = points.end
    }

    for (var i = 0; i < points.length; i += 3) {
      newPoints.push(points[i] + offset, points[i + 1], points[i + 2])
    }
    return newPoints
  }

  // Transforms the coordinates of each feature in the given tile from
  // mercator-projected space into (extent x extent) tile space.
  function transformTile(tile, extent) {
    if (tile.transformed) return tile

    var z2 = 1 << tile.z,
      tx = tile.x,
      ty = tile.y,
      i,
      j,
      k

    for (i = 0; i < tile.features.length; i++) {
      var feature = tile.features[i],
        geom = feature.geometry,
        type = feature.type

      feature.geometry = []

      if (type === 1) {
        for (j = 0; j < geom.length; j += 2) {
          feature.geometry.push(transformPoint(geom[j], geom[j + 1], extent, z2, tx, ty))
        }
      } else {
        for (j = 0; j < geom.length; j++) {
          var ring = []
          for (k = 0; k < geom[j].length; k += 2) {
            ring.push(transformPoint(geom[j][k], geom[j][k + 1], extent, z2, tx, ty))
          }
          feature.geometry.push(ring)
        }
      }
    }

    tile.transformed = true

    return tile
  }

  function transformPoint(x, y, extent, z2, tx, ty) {
    return [Math.round(extent * (x * z2 - tx)), Math.round(extent * (y * z2 - ty))]
  }

  function createTile(features, z, tx, ty, options) {
    var tolerance = z === options.maxZoom ? 0 : options.tolerance / ((1 << z) * options.extent)
    var tile = {
      features: [],
      numPoints: 0,
      numSimplified: 0,
      numFeatures: 0,
      source: null,
      x: tx,
      y: ty,
      z: z,
      transformed: false,
      minX: 2,
      minY: 1,
      maxX: -1,
      maxY: 0,
    }
    for (var i = 0; i < features.length; i++) {
      tile.numFeatures++
      addFeature(tile, features[i], tolerance, options)

      var minX = features[i].minX
      var minY = features[i].minY
      var maxX = features[i].maxX
      var maxY = features[i].maxY

      if (minX < tile.minX) tile.minX = minX
      if (minY < tile.minY) tile.minY = minY
      if (maxX > tile.maxX) tile.maxX = maxX
      if (maxY > tile.maxY) tile.maxY = maxY
    }
    return tile
  }

  function addFeature(tile, feature, tolerance, options) {
    var geom = feature.geometry,
      type = feature.type,
      simplified = []

    if (type === 'Point' || type === 'MultiPoint') {
      for (var i = 0; i < geom.length; i += 3) {
        simplified.push(geom[i])
        simplified.push(geom[i + 1])
        tile.numPoints++
        tile.numSimplified++
      }
    } else if (type === 'LineString') {
      addLine(simplified, geom, tile, tolerance, false, false)
    } else if (type === 'MultiLineString' || type === 'Polygon') {
      for (i = 0; i < geom.length; i++) {
        addLine(simplified, geom[i], tile, tolerance, type === 'Polygon', i === 0)
      }
    } else if (type === 'MultiPolygon') {
      for (var k = 0; k < geom.length; k++) {
        var polygon = geom[k]
        for (i = 0; i < polygon.length; i++) {
          addLine(simplified, polygon[i], tile, tolerance, true, i === 0)
        }
      }
    }

    if (simplified.length) {
      var tags = feature.tags || null
      if (type === 'LineString' && options.lineMetrics) {
        tags = {}
        for (var key in feature.tags) tags[key] = feature.tags[key]
        tags['mapbox_clip_start'] = geom.start / geom.size
        tags['mapbox_clip_end'] = geom.end / geom.size
      }
      var tileFeature = {
        geometry: simplified,
        type:
          type === 'Polygon' || type === 'MultiPolygon'
            ? 3
            : type === 'LineString' || type === 'MultiLineString'
            ? 2
            : 1,
        tags: tags,
      }
      if (feature.id !== null) {
        tileFeature.id = feature.id
      }
      tile.features.push(tileFeature)
    }
  }

  function addLine(result, geom, tile, tolerance, isPolygon, isOuter) {
    var sqTolerance = tolerance * tolerance

    if (tolerance > 0 && geom.size < (isPolygon ? sqTolerance : tolerance)) {
      tile.numPoints += geom.length / 3
      return
    }

    var ring = []

    for (var i = 0; i < geom.length; i += 3) {
      if (tolerance === 0 || geom[i + 2] > sqTolerance) {
        tile.numSimplified++
        ring.push(geom[i])
        ring.push(geom[i + 1])
      }
      tile.numPoints++
    }

    if (isPolygon) rewind(ring, isOuter)

    result.push(ring)
  }

  function rewind(ring, clockwise) {
    var area = 0
    for (var i = 0, len = ring.length, j = len - 2; i < len; j = i, i += 2) {
      area += (ring[i] - ring[j]) * (ring[i + 1] + ring[j + 1])
    }
    if (area > 0 === clockwise) {
      for (i = 0, len = ring.length; i < len / 2; i += 2) {
        var x = ring[i]
        var y = ring[i + 1]
        ring[i] = ring[len - 2 - i]
        ring[i + 1] = ring[len - 1 - i]
        ring[len - 2 - i] = x
        ring[len - 1 - i] = y
      }
    }
  }

  function geojsonvt(data, options) {
    return new GeoJSONVT(data, options)
  }

  function GeoJSONVT(data, options) {
    options = this.options = extend(Object.create(this.options), options)

    var debug = options.debug

    if (debug) console.time('preprocess data')

    if (options.maxZoom < 0 || options.maxZoom > 24)
      throw new Error('maxZoom should be in the 0-24 range')
    if (options.promoteId && options.generateId)
      throw new Error('promoteId and generateId cannot be used together.')

    var features = convert(data, options)

    this.tiles = {}
    this.tileCoords = []

    if (debug) {
      console.timeEnd('preprocess data')
      console.log('index: maxZoom: %d, maxPoints: %d', options.indexMaxZoom, options.indexMaxPoints)
      console.time('generate tiles')
      this.stats = {}
      this.total = 0
    }

    features = wrap(features, options)

    // start slicing from the top tile down
    if (features.length) this.splitTile(features, 0, 0, 0)

    if (debug) {
      if (features.length)
        console.log('features: %d, points: %d', this.tiles[0].numFeatures, this.tiles[0].numPoints)
      console.timeEnd('generate tiles')
      console.log('tiles generated:', this.total, JSON.stringify(this.stats))
    }
  }

  GeoJSONVT.prototype.options = {
    maxZoom: 14, // max zoom to preserve detail on
    indexMaxZoom: 5, // max zoom in the tile index
    indexMaxPoints: 100000, // max number of points per tile in the tile index
    tolerance: 3, // simplification tolerance (higher means simpler)
    extent: 4096, // tile extent
    buffer: 64, // tile buffer on each side
    lineMetrics: false, // whether to calculate line metrics
    promoteId: null, // name of a feature property to be promoted to feature.id
    generateId: false, // whether to generate feature ids. Cannot be used with promoteId
    debug: 0, // logging level (0, 1 or 2)
  }

  GeoJSONVT.prototype.splitTile = function(features, z, x, y, cz, cx, cy) {
    var stack = [features, z, x, y],
      options = this.options,
      debug = options.debug

    // avoid recursion by using a processing queue
    while (stack.length) {
      y = stack.pop()
      x = stack.pop()
      z = stack.pop()
      features = stack.pop()

      var z2 = 1 << z,
        id = toID(z, x, y),
        tile = this.tiles[id]

      if (!tile) {
        if (debug > 1) console.time('creation')

        tile = this.tiles[id] = createTile(features, z, x, y, options)
        this.tileCoords.push({ z: z, x: x, y: y })

        if (debug) {
          if (debug > 1) {
            console.log(
              'tile z%d-%d-%d (features: %d, points: %d, simplified: %d)',
              z,
              x,
              y,
              tile.numFeatures,
              tile.numPoints,
              tile.numSimplified
            )
            console.timeEnd('creation')
          }
          var key = 'z' + z
          this.stats[key] = (this.stats[key] || 0) + 1
          this.total++
        }
      }

      // save reference to original geometry in tile so that we can drill down later if we stop now
      tile.source = features

      // if it's the first-pass tiling
      if (!cz) {
        // stop tiling if we reached max zoom, or if the tile is too simple
        if (z === options.indexMaxZoom || tile.numPoints <= options.indexMaxPoints) continue

        // if a drilldown to a specific tile
      } else {
        // stop tiling if we reached base zoom or our target tile zoom
        if (z === options.maxZoom || z === cz) continue

        // stop tiling if it's not an ancestor of the target tile
        var m = 1 << (cz - z)
        if (x !== Math.floor(cx / m) || y !== Math.floor(cy / m)) continue
      }

      // if we slice further down, no need to keep source geometry
      tile.source = null

      if (features.length === 0) continue

      if (debug > 1) console.time('clipping')

      // values we'll use for clipping
      var k1 = (0.5 * options.buffer) / options.extent,
        k2 = 0.5 - k1,
        k3 = 0.5 + k1,
        k4 = 1 + k1,
        tl,
        bl,
        tr,
        br,
        left,
        right

      tl = bl = tr = br = null

      left = clip(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX, options)
      right = clip(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX, options)
      features = null

      if (left) {
        tl = clip(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options)
        bl = clip(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options)
        left = null
      }

      if (right) {
        tr = clip(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY, options)
        br = clip(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY, options)
        right = null
      }

      if (debug > 1) console.timeEnd('clipping')

      stack.push(tl || [], z + 1, x * 2, y * 2)
      stack.push(bl || [], z + 1, x * 2, y * 2 + 1)
      stack.push(tr || [], z + 1, x * 2 + 1, y * 2)
      stack.push(br || [], z + 1, x * 2 + 1, y * 2 + 1)
    }
  }

  GeoJSONVT.prototype.getTile = function(z, x, y) {
    var options = this.options,
      extent = options.extent,
      debug = options.debug

    if (z < 0 || z > 24) return null

    var z2 = 1 << z
    x = ((x % z2) + z2) % z2 // wrap tile x coordinate

    var id = toID(z, x, y)
    if (this.tiles[id]) return transformTile(this.tiles[id], extent)

    if (debug > 1) console.log('drilling down to z%d-%d-%d', z, x, y)

    var z0 = z,
      x0 = x,
      y0 = y,
      parent

    while (!parent && z0 > 0) {
      z0--
      x0 = Math.floor(x0 / 2)
      y0 = Math.floor(y0 / 2)
      parent = this.tiles[toID(z0, x0, y0)]
    }

    if (!parent || !parent.source) return null

    // if we found a parent tile containing the original geometry, we can drill down from it
    if (debug > 1) console.log('found parent tile z%d-%d-%d', z0, x0, y0)

    if (debug > 1) console.time('drilling down')
    this.splitTile(parent.source, z0, x0, y0, z, x, y)
    if (debug > 1) console.timeEnd('drilling down')

    return this.tiles[id] ? transformTile(this.tiles[id], extent) : null
  }

  function toID(z, x, y) {
    return ((1 << z) * y + x) * 32 + z
  }

  function extend(dest, src) {
    for (var i in src) dest[i] = src[i]
    return dest
  }

  var d2r = Math.PI / 180,
    r2d = 180 / Math.PI

  /**
   * Get the bbox of a tile
   *
   * @name tileToBBOX
   * @param {Array<number>} tile
   * @returns {Array<number>} bbox
   * @example
   * var bbox = tileToBBOX([5, 10, 10])
   * //=bbox
   */
  function tileToBBOX(tile) {
    var e = tile2lon(tile[0] + 1, tile[2])
    var w = tile2lon(tile[0], tile[2])
    var s = tile2lat(tile[1] + 1, tile[2])
    var n = tile2lat(tile[1], tile[2])
    return [w, s, e, n]
  }

  /**
   * Get a geojson representation of a tile
   *
   * @name tileToGeoJSON
   * @param {Array<number>} tile
   * @returns {Feature<Polygon>}
   * @example
   * var poly = tileToGeoJSON([5, 10, 10])
   * //=poly
   */
  function tileToGeoJSON(tile) {
    var bbox = tileToBBOX(tile)
    var poly = {
      type: 'Polygon',
      coordinates: [
        [
          [bbox[0], bbox[1]],
          [bbox[0], bbox[3]],
          [bbox[2], bbox[3]],
          [bbox[2], bbox[1]],
          [bbox[0], bbox[1]],
        ],
      ],
    }
    return poly
  }

  function tile2lon(x, z) {
    return (x / Math.pow(2, z)) * 360 - 180
  }

  function tile2lat(y, z) {
    var n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
    return r2d * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  }

  /**
   * Get the tile for a point at a specified zoom level
   *
   * @name pointToTile
   * @param {number} lon
   * @param {number} lat
   * @param {number} z
   * @returns {Array<number>} tile
   * @example
   * var tile = pointToTile(1, 1, 20)
   * //=tile
   */
  function pointToTile(lon, lat, z) {
    var tile = pointToTileFraction(lon, lat, z)
    tile[0] = Math.floor(tile[0])
    tile[1] = Math.floor(tile[1])
    return tile
  }

  /**
   * Get the 4 tiles one zoom level higher
   *
   * @name getChildren
   * @param {Array<number>} tile
   * @returns {Array<Array<number>>} tiles
   * @example
   * var tiles = getChildren([5, 10, 10])
   * //=tiles
   */
  function getChildren(tile) {
    return [
      [tile[0] * 2, tile[1] * 2, tile[2] + 1],
      [tile[0] * 2 + 1, tile[1] * 2, tile[2] + 1],
      [tile[0] * 2 + 1, tile[1] * 2 + 1, tile[2] + 1],
      [tile[0] * 2, tile[1] * 2 + 1, tile[2] + 1],
    ]
  }

  /**
   * Get the tile one zoom level lower
   *
   * @name getParent
   * @param {Array<number>} tile
   * @returns {Array<number>} tile
   * @example
   * var tile = getParent([5, 10, 10])
   * //=tile
   */
  function getParent(tile) {
    // top left
    if (tile[0] % 2 === 0 && tile[1] % 2 === 0) {
      return [tile[0] / 2, tile[1] / 2, tile[2] - 1]
    }
    // bottom left
    if (tile[0] % 2 === 0 && !tile[1] % 2 === 0) {
      return [tile[0] / 2, (tile[1] - 1) / 2, tile[2] - 1]
    }
    // top right
    if (!tile[0] % 2 === 0 && tile[1] % 2 === 0) {
      return [(tile[0] - 1) / 2, tile[1] / 2, tile[2] - 1]
    }
    // bottom right
    return [(tile[0] - 1) / 2, (tile[1] - 1) / 2, tile[2] - 1]
  }

  function getSiblings(tile) {
    return getChildren(getParent(tile))
  }

  /**
   * Get the 3 sibling tiles for a tile
   *
   * @name getSiblings
   * @param {Array<number>} tile
   * @returns {Array<Array<number>>} tiles
   * @example
   * var tiles = getSiblings([5, 10, 10])
   * //=tiles
   */
  function hasSiblings(tile, tiles) {
    var siblings = getSiblings(tile)
    for (var i = 0; i < siblings.length; i++) {
      if (!hasTile(tiles, siblings[i])) return false
    }
    return true
  }

  /**
   * Check to see if an array of tiles contains a particular tile
   *
   * @name hasTile
   * @param {Array<Array<number>>} tiles
   * @param {Array<number>} tile
   * @returns {boolean}
   * @example
   * var tiles = [
   *     [0, 0, 5],
   *     [0, 1, 5],
   *     [1, 1, 5],
   *     [1, 0, 5]
   * ]
   * hasTile(tiles, [0, 0, 5])
   * //=boolean
   */
  function hasTile(tiles, tile) {
    for (var i = 0; i < tiles.length; i++) {
      if (tilesEqual(tiles[i], tile)) return true
    }
    return false
  }

  /**
   * Check to see if two tiles are the same
   *
   * @name tilesEqual
   * @param {Array<number>} tile1
   * @param {Array<number>} tile2
   * @returns {boolean}
   * @example
   * tilesEqual([0, 1, 5], [0, 0, 5])
   * //=boolean
   */
  function tilesEqual(tile1, tile2) {
    return tile1[0] === tile2[0] && tile1[1] === tile2[1] && tile1[2] === tile2[2]
  }

  /**
   * Get the quadkey for a tile
   *
   * @name tileToQuadkey
   * @param {Array<number>} tile
   * @returns {string} quadkey
   * @example
   * var quadkey = tileToQuadkey([0, 1, 5])
   * //=quadkey
   */
  function tileToQuadkey(tile) {
    var index = ''
    for (var z = tile[2]; z > 0; z--) {
      var b = 0
      var mask = 1 << (z - 1)
      if ((tile[0] & mask) !== 0) b++
      if ((tile[1] & mask) !== 0) b += 2
      index += b.toString()
    }
    return index
  }

  /**
   * Get the tile for a quadkey
   *
   * @name quadkeyToTile
   * @param {string} quadkey
   * @returns {Array<number>} tile
   * @example
   * var tile = quadkeyToTile('00001033')
   * //=tile
   */
  function quadkeyToTile(quadkey) {
    var x = 0
    var y = 0
    var z = quadkey.length

    for (var i = z; i > 0; i--) {
      var mask = 1 << (i - 1)
      var q = +quadkey[z - i]
      if (q === 1) x |= mask
      if (q === 2) y |= mask
      if (q === 3) {
        x |= mask
        y |= mask
      }
    }
    return [x, y, z]
  }

  /**
   * Get the smallest tile to cover a bbox
   *
   * @name bboxToTile
   * @param {Array<number>} bbox
   * @returns {Array<number>} tile
   * @example
   * var tile = bboxToTile([ -178, 84, -177, 85 ])
   * //=tile
   */
  function bboxToTile(bboxCoords) {
    var min = pointToTile(bboxCoords[0], bboxCoords[1], 32)
    var max = pointToTile(bboxCoords[2], bboxCoords[3], 32)
    var bbox = [min[0], min[1], max[0], max[1]]

    var z = getBboxZoom(bbox)
    if (z === 0) return [0, 0, 0]
    var x = bbox[0] >>> (32 - z)
    var y = bbox[1] >>> (32 - z)
    return [x, y, z]
  }

  function getBboxZoom(bbox) {
    var MAX_ZOOM = 28
    for (var z = 0; z < MAX_ZOOM; z++) {
      var mask = 1 << (32 - (z + 1))
      if ((bbox[0] & mask) !== (bbox[2] & mask) || (bbox[1] & mask) !== (bbox[3] & mask)) {
        return z
      }
    }

    return MAX_ZOOM
  }

  /**
   * Get the precise fractional tile location for a point at a zoom level
   *
   * @name pointToTileFraction
   * @param {number} lon
   * @param {number} lat
   * @param {number} z
   * @returns {Array<number>} tile fraction
   * var tile = pointToTileFraction(30.5, 50.5, 15)
   * //=tile
   */
  function pointToTileFraction(lon, lat, z) {
    var sin = Math.sin(lat * d2r),
      z2 = Math.pow(2, z),
      x = z2 * (lon / 360 + 0.5),
      y = z2 * (0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI)
    return [x, y, z]
  }

  var tilebelt = {
    tileToGeoJSON: tileToGeoJSON,
    tileToBBOX: tileToBBOX,
    getChildren: getChildren,
    getParent: getParent,
    getSiblings: getSiblings,
    hasTile: hasTile,
    hasSiblings: hasSiblings,
    tilesEqual: tilesEqual,
    tileToQuadkey: tileToQuadkey,
    quadkeyToTile: quadkeyToTile,
    pointToTile: pointToTile,
    bboxToTile: bboxToTile,
    pointToTileFraction: pointToTileFraction,
  }

  const GEOM_TYPES = {
    BLOB: 'blob',
    GRIDDED: 'gridded',
    EXTRUDED: 'extruded',
  }

  const BUFFER_HEADERS = ['cell', 'min', 'max']

  const rawTileToIntArray = (rawTileArrayBuffer, { tileset }) => {
    const tile = new VectorTile$1(new pbf(rawTileArrayBuffer))
    const tileLayer = tile.layers[tileset]

    let bufferSize = 0
    const featuresProps = []
    for (let f = 0; f < tileLayer.length; f++) {
      const rawFeature = tileLayer.feature(f)
      const values = rawFeature.properties
      const cell = values.cell

      delete values.cell

      const allTimestampsRaw = Object.keys(values)
      const allTimestamps = allTimestampsRaw.map((t) => parseInt(t))
      const minTimestamp = Math.min(...allTimestamps)
      const maxTimestamp = Math.max(...allTimestamps)

      const featureSize = BUFFER_HEADERS.length + (maxTimestamp - minTimestamp + 1)

      featuresProps.push({
        values,
        cell,
        minTimestamp,
        maxTimestamp,
        featureSize,
      })

      bufferSize += featureSize
    }

    const buffer = new Uint16Array(bufferSize)
    let bufferPos = 0
    featuresProps.forEach((featureProps, i) => {
      buffer[bufferPos + 0] = featureProps.cell
      buffer[bufferPos + 1] = featureProps.minTimestamp
      buffer[bufferPos + 2] = featureProps.maxTimestamp
      let featureBufferPos = bufferPos + BUFFER_HEADERS.length

      for (let d = featureProps.minTimestamp; d <= featureProps.maxTimestamp; d++) {
        const currentValue = featureProps.values[d.toString()]
        buffer[featureBufferPos] = currentValue || 0
        featureBufferPos++
      }

      bufferPos += featureProps.featureSize
    })

    return buffer
  }

  const getCellCoords = (tileBBox, cell, numCells) => {
    const col = cell % numCells
    const row = Math.floor(cell / numCells)
    const [minX, minY, maxX, maxY] = tileBBox
    const width = maxX - minX
    const height = maxY - minY
    return {
      col,
      row,
      width,
      height,
    }
  }

  const getPointGeom = (tileBBox, cell, numCells) => {
    const [minX, minY] = tileBBox
    const { col, row, width, height } = getCellCoords(tileBBox, cell, numCells)

    const pointMinX = minX + (col / numCells) * width
    const pointMinY = minY + (row / numCells) * height

    return {
      type: 'Point',
      coordinates: [pointMinX, pointMinY],
    }
  }

  const getSquareGeom = (tileBBox, cell, numCells) => {
    const [minX, minY] = tileBBox
    const { col, row, width, height } = getCellCoords(tileBBox, cell, numCells)

    const squareMinX = minX + (col / numCells) * width
    const squareMinY = minY + (row / numCells) * height
    const squareMaxX = minX + ((col + 1) / numCells) * width
    const squareMaxY = minY + ((row + 1) / numCells) * height
    return {
      type: 'Polygon',
      coordinates: [
        [
          [squareMinX, squareMinY],
          [squareMaxX, squareMinY],
          [squareMaxX, squareMaxY],
          [squareMinX, squareMaxY],
          [squareMinX, squareMinY],
        ],
      ],
    }
  }

  const aggregate = (
    arrayBuffer,
    {
      quantizeOffset,
      tileBBox,
      delta = 30,
      geomType = GEOM_TYPES.GRIDDED,
      numCells = 64,
      skipOddCells = false,
      singleFrameStart = null,
    }
  ) => {
    const features = []

    let aggregating = []
    let currentFeature = {
      type: 'Feature',
      properties: {},
    }
    let currentFeatureCell
    let currentFeatureMinTimestamp
    let currentFeatureMaxTimestamp
    let currentFeatureTimestampDelta
    let currentAggregatedValue = 0
    let featureBufferPos = 0
    let head
    let tail

    const writeValueToFeature = (quantizedTail) => {
      // TODO add skipOddCells check
      if (singleFrameStart === null) {
        currentFeature.properties[quantizedTail.toString()] = currentAggregatedValue
      } else {
        if (singleFrameStart === quantizedTail) {
          currentFeature.properties.value = currentAggregatedValue
        }
      }
    }

    // write values after tail > minTimestamp
    const writeFinalTail = () => {
      let finalTailValue = 0
      for (let finalTail = tail + 1; finalTail <= currentFeatureMaxTimestamp; finalTail++) {
        currentAggregatedValue = currentAggregatedValue - finalTailValue
        if (finalTail > currentFeatureMinTimestamp) {
          finalTailValue = aggregating.shift()
        } else {
          finalTailValue = 0
        }
        const quantizedTail = finalTail - quantizeOffset
        if (quantizedTail >= 0) {
          writeValueToFeature(quantizedTail)
        }
      }
    }

    for (let i = 0; i < arrayBuffer.length; i++) {
      const value = arrayBuffer[i]

      switch (featureBufferPos) {
        // cell
        case 0:
          currentFeatureCell = value
          if (geomType === GEOM_TYPES.BLOB) {
            currentFeature.geometry = getPointGeom(tileBBox, currentFeatureCell, numCells)
          } else {
            currentFeature.geometry = getSquareGeom(tileBBox, currentFeatureCell, numCells)
          }
          break
        // minTs
        case 1:
          currentFeatureMinTimestamp = value
          head = currentFeatureMinTimestamp
          break
        // mx
        case 2:
          currentFeatureMaxTimestamp = value
          currentFeatureTimestampDelta = currentFeatureMaxTimestamp - currentFeatureMinTimestamp
          break
        // actual value
        default:
          // when we are looking at ts 0 and delta is 10, we are in fact looking at the aggregation of day -9
          tail = head - delta + 1

          aggregating.push(value)

          let tailValue = 0
          if (tail > currentFeatureMinTimestamp) {
            tailValue = aggregating.shift()
          }
          currentAggregatedValue = currentAggregatedValue + value - tailValue

          const quantizedTail = tail - quantizeOffset

          if (currentAggregatedValue > 0 && quantizedTail >= 0) {
            writeValueToFeature(quantizedTail)
          }
          head++
      }
      featureBufferPos++

      const isEndOfFeature =
        featureBufferPos - BUFFER_HEADERS.length - 1 === currentFeatureTimestampDelta

      if (isEndOfFeature) {
        writeFinalTail()
        features.push(currentFeature)
        currentFeature = {
          type: 'Feature',
          properties: {},
        }
        featureBufferPos = 0
        currentAggregatedValue = 0
        aggregating = []
        continue
      }
    }

    const geoJSON = {
      type: 'FeatureCollection',
      features,
    }
    return geoJSON
  }

  /* eslint no-restricted-globals: "off" */

  const FAST_TILES_KEY = '__fast_tiles__'
  const FAST_TILES_KEY_RX = new RegExp(FAST_TILES_KEY)
  const FAST_TILES_KEY_XYZ_RX = new RegExp(`${FAST_TILES_KEY}\\/(\\d+)\\/(\\d+)\\/(\\d+)`)
  const CACHE_TIMESTAMP_HEADER_KEY = 'sw-cache-timestamp'
  const CACHE_NAME = FAST_TILES_KEY
  const CACHE_MAX_AGE_MS = 60 * 60 * 1000

  const isoToDate = (iso) => {
    return new Date(iso).getTime()
  }

  const isoToDay = (iso) => {
    return isoToDate(iso) / 1000 / 60 / 60 / 24
  }

  self.addEventListener('install', (event) => {
    console.log('install sw')
    // cleaning up old cache values...
  })

  self.addEventListener('activate', (event) => {
    console.log('activate sw_')
    // self.clients.claim()

    // const allClients = clients.matchAll({
    //   includeUncontrolled: true
    // }).then((a) => {
    //   console.log(a)
    // });

    // Claim control of clients right after activating
    // This allows
    event.waitUntil(
      self.clients.claim().then(() => {
        console.log('Now ready to handle fetches?')
      })
    )
    console.log('Now ready to handle fetches!')
  })

  const aggregateIntArray = (
    intArray,
    { geomType, numCells, delta, x, y, z, quantizeOffset, start, singleFrameStart }
  ) => {
    const tileBBox = tilebelt.tileToBBOX([x, y, z])
    const aggregated = aggregate(intArray, {
      quantizeOffset,
      tileBBox,
      delta,
      geomType,
      numCells,
      singleFrameStart,
      // TODO make me configurable
      skipOddCells: false,
    })
    return aggregated
  }

  const decodeTile = (originalResponse, tileset) => {
    return originalResponse.arrayBuffer().then((buffer) => {
      const intArray = rawTileToIntArray(buffer, { tileset })
      return intArray
    })
  }

  const encodeTileResponse = (aggregatedGeoJSON, { x, y, z, tileset }) => {
    const tileindex = geojsonvt(aggregatedGeoJSON)
    const newTile = tileindex.getTile(z, x, y)
    const newBuff = vtPbf.fromGeojsonVt({ [tileset]: newTile })

    return new Response(newBuff)
  }

  self.addEventListener('fetch', (fetchEvent) => {
    const originalUrl = fetchEvent.request.url

    if (FAST_TILES_KEY_RX.test(originalUrl) !== true) {
      return
    }

    const url = new URL(originalUrl)
    const tileset = url.searchParams.get('tileset')
    const geomType = url.searchParams.get('geomType')
    const fastTilesAPI = url.searchParams.get('fastTilesAPI')
    const quantizeOffset = parseInt(url.searchParams.get('quantizeOffset'))
    const delta = parseInt(url.searchParams.get('delta') || '10')
    const singleFrame = url.searchParams.get('singleFrame') === 'true'
    const start = isoToDay(url.searchParams.get('start'))
    const serverSideFilters = url.searchParams.get('serverSideFilters')

    const [z, x, y] = originalUrl
      .match(FAST_TILES_KEY_XYZ_RX)
      .slice(1, 4)
      .map((d) => parseInt(d))

    const TILESET_NUM_CELLS = 64
    const aggregateParams = {
      geomType,
      numCells: TILESET_NUM_CELLS,
      delta,
      x,
      y,
      z,
      quantizeOffset,
      tileset,
      singleFrameStart: singleFrame ? start - quantizeOffset : null,
    }

    const finalUrl = new URL(`${fastTilesAPI}${tileset}/tile/heatmap/${z}/${x}/${y}`)

    if (serverSideFilters) {
      finalUrl.searchParams.set('filters', serverSideFilters)
    }
    const finalUrlStr = decodeURI(finalUrl.toString())
    // console.log('real tile zoom', z)
    const finalReq = new Request(finalUrlStr)

    const cachePromise = self.caches.match(finalReq).then((cacheResponse) => {
      const now = new Date().getTime()
      const cachedTimestamp =
        cacheResponse && parseInt(cacheResponse.headers.get(CACHE_TIMESTAMP_HEADER_KEY))
      // only get value from cache if it's recent enough
      const hasRecentCache = cacheResponse && now - cachedTimestamp < CACHE_MAX_AGE_MS
      if (hasRecentCache) {
        return cacheResponse.arrayBuffer().then((ab) => {
          const intArray = new Uint16Array(ab)
          const aggregated = aggregateIntArray(intArray, aggregateParams)
          return encodeTileResponse(aggregated, aggregateParams)
        })
      }

      const fetchPromise = fetch(finalUrl)
      const decodePromise = fetchPromise.then((fetchResponse) => {
        if (!fetchResponse.ok) throw new Error()
        // Response needs to be cloned to m odify headers (used for cache expiration)
        // const responseToCache = fetchResponse.clone()
        const decoded = decodeTile(fetchResponse, tileset)
        return decoded
      })

      // Cache fetch response in parallel
      decodePromise.then((intArray) => {
        const headers = new Headers()
        const timestamp = new Date().getTime()
        // add extra header to set a timestamp on cache - will be read at cache.matches call
        headers.set(CACHE_TIMESTAMP_HEADER_KEY, timestamp)
        // convert response to decoded int arrays
        const blob = new Blob([intArray], { type: 'application/octet-binary' })

        const cacheResponse = new Response(blob, {
          // status: fetchResponse.status,
          // statusText: fetchResponse.statusText,
          headers,
        })
        self.caches.open(CACHE_NAME).then((cache) => {
          cache.put(finalReq, cacheResponse)
        })
      })

      // then, aggregate
      const aggregatePromise = decodePromise.then((intArray) => {
        const aggregated = aggregateIntArray(intArray, aggregateParams)
        return encodeTileResponse(aggregated, aggregateParams)
      })
      return aggregatePromise
    })
    fetchEvent.respondWith(cachePromise)
  })
})()
