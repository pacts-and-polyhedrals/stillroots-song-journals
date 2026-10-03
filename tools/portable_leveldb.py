"""Minimal, dependency-free initial LevelDB database writer.

Produces a normal MANIFEST + write-ahead log, not a renamed JSON database.
The native engine replays this log on first open. GitHub releases additionally
open, compare, and compact these packs with the official Foundry CLI.

Format references (implementation is original):
https://github.com/google/leveldb/blob/main/doc/log_format.md
https://github.com/google/leveldb/blob/main/db/write_batch.cc
https://github.com/google/leveldb/blob/main/db/version_edit.cc
"""
from __future__ import annotations
import json
import pathlib
import struct

BLOCK_SIZE = 32768
HEADER_SIZE = 7

def _crc_table() -> list[int]:
    table = []
    for value in range(256):
        for _ in range(8):
            value = (value >> 1) ^ (0x82F63B78 if value & 1 else 0)
        table.append(value)
    return table

CRC_TABLE = _crc_table()

def crc32c(data: bytes) -> int:
    crc = 0xFFFFFFFF
    for byte in data:
        crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >> 8)
    return crc ^ 0xFFFFFFFF

def masked_crc(data: bytes) -> int:
    crc = crc32c(data)
    return (((crc >> 15) | ((crc << 17) & 0xFFFFFFFF)) + 0xA282EAD8) & 0xFFFFFFFF

def varint(value: int) -> bytes:
    if value < 0:
        raise ValueError('Varints must be nonnegative')
    out = bytearray()
    while value >= 128:
        out.append((value & 127) | 128)
        value >>= 7
    out.append(value)
    return bytes(out)

def prefixed(data: bytes) -> bytes:
    return varint(len(data)) + data

def log_records(records: list[bytes]) -> bytes:
    out = bytearray()
    for record in records:
        pos = 0
        first = True
        while first or pos < len(record):
            remaining = BLOCK_SIZE - (len(out) % BLOCK_SIZE)
            if remaining < HEADER_SIZE:
                out.extend(b'\0' * remaining)
                remaining = BLOCK_SIZE
            take = min(remaining - HEADER_SIZE, len(record) - pos)
            last = pos + take == len(record)
            kind = 1 if first and last else 2 if first else 4 if last else 3
            fragment = record[pos:pos+take]
            out.extend(struct.pack('<IHB', masked_crc(bytes([kind])+fragment), take, kind))
            out.extend(fragment)
            pos += take
            first = False
    return bytes(out)

def write_database(destination: pathlib.Path, records: dict[str, object]) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    if list(destination.iterdir()):
        raise ValueError('Refusing to overwrite a non-empty LevelDB directory')
    items = sorted(records.items())
    batch = bytearray(struct.pack('<QI', 1, len(items)))
    for key, value in items:
        encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        batch.extend(b'\x01' + prefixed(key.encode('utf-8')) + prefixed(encoded))
    comparator = b'leveldb.BytewiseComparator'
    manifest = varint(1)+prefixed(comparator)+varint(2)+varint(2)+varint(3)+varint(3)+varint(4)+varint(0)+varint(9)+varint(0)
    (destination/'CURRENT').write_bytes(b'MANIFEST-000001\n')
    (destination/'MANIFEST-000001').write_bytes(log_records([manifest]))
    (destination/'000002.log').write_bytes(log_records([bytes(batch)]))

# The reader below is a validation utility for our initial WAL-only packs. It is
# deliberately NOT a replacement for the native LevelDB engine or its SSTables.
def read_log(data: bytes) -> list[bytes]:
    pos = 0
    accumulated = None
    records = []
    while pos < len(data):
        remaining = BLOCK_SIZE - pos % BLOCK_SIZE
        if remaining < HEADER_SIZE:
            assert data[pos:pos+remaining] == b'\0' * remaining, 'Invalid log trailer'
            pos += remaining
            continue
        assert pos+HEADER_SIZE <= len(data), 'Truncated log header'
        checksum, length, kind = struct.unpack('<IHB', data[pos:pos+HEADER_SIZE])
        assert length <= remaining-HEADER_SIZE, 'Record crosses a block boundary'
        pos += HEADER_SIZE
        fragment = data[pos:pos+length]
        assert len(fragment) == length, 'Truncated log fragment'
        pos += length
        assert masked_crc(bytes([kind])+fragment) == checksum, 'CRC32C mismatch'
        if kind == 1:
            assert accumulated is None
            records.append(fragment)
        elif kind == 2:
            assert accumulated is None
            accumulated = bytearray(fragment)
        elif kind == 3:
            assert accumulated is not None
            accumulated.extend(fragment)
        elif kind == 4:
            assert accumulated is not None
            accumulated.extend(fragment)
            records.append(bytes(accumulated))
            accumulated = None
        else:
            raise AssertionError('Unknown record kind')
    assert accumulated is None, 'Unfinished fragmented record'
    return records

def read_varint(data: bytes, pos: int) -> tuple[int,int]:
    result = 0
    for shift in range(0, 70, 7):
        byte = data[pos]
        pos += 1
        result |= (byte & 127) << shift
        if not byte & 128:
            return result, pos
    raise ValueError('Invalid varint')

def read_string(data: bytes, pos: int) -> tuple[bytes,int]:
    length, pos = read_varint(data,pos)
    assert pos+length <= len(data)
    return data[pos:pos+length], pos+length

def read_database(path: pathlib.Path) -> dict[str,object]:
    assert (path/'CURRENT').read_text() == 'MANIFEST-000001\n'
    [manifest] = read_log((path/'MANIFEST-000001').read_bytes())
    values = {}; pos=0
    while pos<len(manifest):
        tag,pos=read_varint(manifest,pos)
        value,pos=read_string(manifest,pos) if tag==1 else read_varint(manifest,pos)
        values[tag]=value
    assert values == {1:b'leveldb.BytewiseComparator',2:2,3:3,4:0,9:0}
    [batch] = read_log((path/'000002.log').read_bytes())
    sequence,count=struct.unpack('<QI',batch[:12])
    assert sequence == 1
    pos=12; result={}
    for _ in range(count):
        assert batch[pos] == 1
        pos += 1
        key,pos=read_string(batch,pos)
        value,pos=read_string(batch,pos)
        key=key.decode('utf-8')
        assert key not in result, 'Duplicate LevelDB key'
        result[key]=json.loads(value)
    assert pos==len(batch), 'Extra bytes after batch'
    return result
