import { logger } from './logger';

const mockMessage = "I'm a fancy pants message";

describe('logger', () => {
  it('contains methods for: info, logOutput, warn, error, success, summary, line break', () => {
    expect(typeof logger.info).toEqual('function');
    expect(typeof logger.logOutput).toEqual('function');
    expect(typeof logger.warn).toEqual('function');
    expect(typeof logger.error).toEqual('function');
    expect(typeof logger.success).toEqual('function');
    expect(typeof logger.summary).toEqual('function');
    expect(typeof logger.lineBreak).toEqual('function');
  });

  it('logs [INFO] + message for info()', () => {
    global.console.log = jest.fn();

    logger.info(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [OUTPUT] + message for logOutput()', () => {
    global.console.log = jest.fn();

    logger.logOutput(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[OUTPUT]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [STDERR] + message for logStderr()', () => {
    global.console.log = jest.fn();

    logger.logStderr(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[STDERR]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [STDOUT] + message for logStdout()', () => {
    global.console.log = jest.fn();

    logger.logStdout(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[STDOUT]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [WARN] + message for warn()', () => {
    global.console.log = jest.fn();

    logger.warn(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[WARN]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [ERROR] + message for error()', () => {
    global.console.log = jest.fn();

    logger.error(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [SUCCESS] + message for success()', () => {
    global.console.log = jest.fn();

    logger.success(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[SUCCESS]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs [SUMMARY] + message for summary()', () => {
    global.console.log = jest.fn();

    logger.summary(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining('[SUMMARY]')
    );
    expect(global.console.log).toHaveBeenCalledWith(
      expect.stringContaining(mockMessage)
    );
  });

  it('logs lineBreak for lineBreak()', () => {
    global.console.log = jest.fn();

    logger.lineBreak(mockMessage);

    expect(global.console.log).toHaveBeenCalledWith('');
  });
});
