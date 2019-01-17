import fs from 'fs';
import { listFilesRecursively, isFile, isDirectory } from './file-util';

describe('file-util', () => {
  describe('isFile', () => {
    it('returns true if fs.stat determines is file', () => {
      fs.statSync = jest.fn(() => ({
        isFile: () => true
      }));
      const res = isFile('blah');
      expect(res).toEqual(true);
    });

    it('returns false if fs.stat determines is not a file', () => {
      fs.statSync = jest.fn(() => ({
        isFile: () => false
      }));
      const res = isFile('blah');
      expect(res).toEqual(false);
    });
  });

  describe('isDirectory', () => {
    it('returns true if fs.stat determines is directory', () => {
      fs.statSync = jest.fn(() => ({
        isDirectory: () => true
      }));
      const res = isDirectory('blah');
      expect(res).toEqual(true);
    });

    it('returns false if fs.stat determines is not a directory', () => {
      fs.statSync = jest.fn(() => ({
        isDirectory: () => false
      }));
      const res = isDirectory('blah');
      expect(res).toEqual(false);
    });
  });

  describe('listFilesRecursively', () => {
    it('adds files found in fs.readDirSync() to file list and returns', () => {
      fs.readdirSync = jest.fn(() => ['filea', 'fileb']);
      fs.statSync = jest.fn(() => ({
        isDirectory: () => false
      }));
      const res = listFilesRecursively('somedir');
      expect(res).toEqual(['somedir/filea', 'somedir/fileb']);
      expect(fs.readdirSync).toHaveBeenCalledWith('somedir');
    });

    it('adds files found in fs.readDirSync() to file list, recurses with directories, and returns', () => {
      fs.readdirSync = jest
        .fn()
        .mockReturnValueOnce(['filea', 'directoryb']) // one file and one dir
        .mockReturnValueOnce(['filec']); // file in directoryb
      fs.statSync = jest.fn(dir => ({
        isDirectory: () => dir === 'somedir/directoryb'
      }));
      const res = listFilesRecursively('somedir');
      expect(res).toEqual(['somedir/filea', 'somedir/directoryb/filec']);
      expect(fs.readdirSync).toHaveBeenCalledWith('somedir');
      expect(fs.readdirSync).toHaveBeenCalledWith('somedir/directoryb');
    });
  });
});
