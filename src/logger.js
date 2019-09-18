import colors from 'colors';

class Logger {
  info (...args) {
    console.log(colors.cyan('[INFO]    ', ...args));
  }
  logOutput (...args) {
    console.log(colors.white('[OUTPUT]  ', ...args));
  }
  logStdout (...args) {
    console.log(colors.green('[STDOUT]  ', ...args));
  }
  logStderr (...args) {
    console.log(colors.yellow('[STDERR]  ', ...args));
  }
  warn (...args) {
    console.log(colors.magenta('[WARN]    ', ...args));
  }
  error (...args) {
    console.log(colors.red('[ERROR]   ', ...args));
  }
  success (...args) {
    console.log(colors.green('[SUCCESS] ', ...args));
  }
  summary (...args) {
    console.log(colors.yellow('[SUMMARY] ', ...args));
  }
  lineBreak () {
    console.log('');
  }
}

export const logger = new Logger();
