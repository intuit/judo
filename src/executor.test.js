import childProcess from 'child_process';
import * as loggerModule from './logger';
import { execute, executePrerequisites } from './executor';

const mockLogger = () => {
  loggerModule.logger.lineBreak = jest.fn();
  loggerModule.logger.info = jest.fn();
  loggerModule.logger.summary = jest.fn();
  loggerModule.logger.success = jest.fn();
  loggerModule.logger.error = jest.fn();
  loggerModule.logger.logOutput = jest.fn();
  loggerModule.logger.logStdout = jest.fn();
  loggerModule.logger.logStderr = jest.fn();
};

const mockExecWorked = () => {
  childProcess.exec = jest.fn((cmd, opts) => ({
    // exits 0 for working
    on: jest.fn((event, cb) => cb(0)), // eslint-disable-line
    stdout: { on: jest.fn((event, cb) => cb('stdout')) }, // eslint-disable-line
    stderr: { on: jest.fn((event, cb) => cb('stderr')) } // eslint-disable-line
  }));
};

const mockExecFailed = () => {
  childProcess.exec = jest.fn(() => ({
    // exits 1 for fail
    on: jest.fn((event, cb) => cb(1)), // eslint-disable-line
    stdout: { on: jest.fn((event, cb) => cb('stdout')) }, // eslint-disable-line
    stderr: { on: jest.fn((event, cb) => cb('stderr')) } // eslint-disable-line
  }));
};

const mockChildSpawnWorked = (writeMock, options = { timeout: 600 }) => {
  childProcess.spawn = jest.fn(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'exit') {
        setTimeout(() => cb(0), options.timeout); // eslint-disable-line
      }
    }),
    stdout: {
      on: jest.fn((event, cb) => {
        if (event === 'data') {
          return cb('hello world!'); // eslint-disable-line
        }
      })
    },
    stderr: {
      on: jest.fn((event, cb) => {
        if (event === 'data') {
          return cb('error world!'); //eslint-disable-line
        }
      })
    },
    stdin: {
      write: writeMock
    }
  }));
};

describe('executor', () => {
  describe('executePrerequisites', () => {
    it('combines commands into one by chaining them with &&, and runs them in the specified cwd', async () => {
      mockLogger();
      mockExecWorked();

      let err;
      let res;

      try {
        res = await executePrerequisites({
          prerequisites: ['cmd1', 'cmd2'],
          cwd: 'some/dir'
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeUndefined();
      expect(childProcess.exec).toHaveBeenCalledWith('cmd1 && cmd2', {
        cwd: 'some/dir'
      });
    });
    it('logs output from stdout and stderr, and logs when complete', async () => {
      mockLogger();
      mockExecWorked();

      let err;
      let res;

      try {
        res = await executePrerequisites({
          prerequisites: ['cmd1', 'cmd2'],
          cwd: 'some/dir'
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeUndefined();
      expect(loggerModule.logger.info).toHaveBeenCalledWith(
        'Prerequisites complete'
      );
      expect(loggerModule.logger.logOutput).toHaveBeenCalledWith('stdout');
      expect(loggerModule.logger.logOutput).toHaveBeenCalledWith('stderr');
    });

    it('rejects if commands exit with non-zero code', async () => {
      mockLogger();
      mockExecFailed();

      let err;
      let res;

      try {
        res = await executePrerequisites({
          prerequisites: ['cmd1', 'cmd2'],
          cwd: 'some/dir'
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeInstanceOf(Error);
    });
    it('resolves if commands exit with zero code', async () => {
      mockLogger();
      mockExecWorked();

      let err;
      let res;

      try {
        res = await executePrerequisites({
          prerequisites: ['cmd1', 'cmd2'],
          cwd: 'some/dir'
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeUndefined();
    });
  });

  describe('execute', () => {
    it('creates new child process, logs output as its emitted,', async () => {
      mockLogger();

      let writeMock = jest.fn();

      mockChildSpawnWorked(writeMock);

      const cmd = 'echo';
      const args = ['hello world!'];
      const opts = {
        argsString: '"hello world!"',
        cwd: undefined,
        when: [],
        timeout: 5000
      };

      await execute(cmd, args, opts);

      expect(childProcess.spawn).toHaveBeenCalledWith(cmd, args, {
        ...opts,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      expect(loggerModule.logger.logStdout).toHaveBeenCalledWith(
        'hello world!'
      );
    });
    it('creates new child process, logs errors as its emitted,', async () => {
      mockLogger();

      let writeMock = jest.fn();

      mockChildSpawnWorked(writeMock);

      const cmd = 'echo';
      const args = ['hello world!', '1>&2'];
      const opts = {
        argsString: '"hello world!"',
        cwd: undefined,
        when: [],
        timeout: 5000
      };

      await execute(cmd, args, opts);

      expect(childProcess.spawn).toHaveBeenCalledWith(cmd, args, {
        ...opts,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      expect(loggerModule.logger.logStderr).toHaveBeenCalledWith(
        'error world!'
      );
    });
    it('creates new child process, and writes "when" responses to child stdin', async () => {
      mockLogger();

      let writeMock = jest.fn();
      let err;
      let res;

      mockChildSpawnWorked(writeMock);

      try {
        res = await execute('echo', ['hello world!'], {
          argsString: '"hello world!"',
          cwd: undefined,
          when: [
            {
              // it should respond to "hello world"
              output: 'world',
              response: 'my response'
            }
          ],
          timeout: 120000
        });
      } catch (e) {
        err = e;
      }

      expect(res).toEqual({ output: 'hello world!error world!', code: 0 });
      expect(err).toBeUndefined();
      expect(writeMock).toHaveBeenCalledWith('my response\r');
    });

    it('creates new child process, rejects if not all "when" assertions are found in cmd output', async () => {
      mockLogger();

      let writeMock = jest.fn();

      mockChildSpawnWorked(writeMock);

      let err;
      let res;

      try {
        res = await execute('echo', ['hello world!'], {
          argsString: '"hello world!"',
          cwd: undefined,
          when: [
            {
              // it should not find "goodbye' in output
              output: 'goodbye',
              response: 'my response'
            }
          ],
          timeout: 120000
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeInstanceOf(Error);
      expect(writeMock).toHaveBeenCalledTimes(0);
    });

    it('creates new child process, rejects if timeout reached', async () => {
      mockLogger();

      let writeMock = jest.fn();
      let err;
      let res;

      mockChildSpawnWorked(writeMock, { timeout: 500 });

      try {
        res = await execute('echo', ['hello world!'], {
          argsString: '"hello world!"',
          cwd: undefined,
          when: [],
          timeout: 100
        });
      } catch (e) {
        err = e;
      }

      expect(res).toBeUndefined();
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain('Timeout of 100ms reached');
      expect(writeMock).toHaveBeenCalledTimes(0);
    });
  });
});
