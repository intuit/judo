import path from 'path';
import fs from 'fs';

const listFilesRecursively = (dir, fileList = []) => {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      fileList = listFilesRecursively(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  });

  return fileList;
};

const isFile = path => fs.statSync(path).isFile();

const isDirectory = path => fs.statSync(path).isDirectory();

export {
  isFile,
  isDirectory,
  listFilesRecursively
};
