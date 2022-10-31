import yaml from 'js-yaml';

import { StepResult } from './models/StepResult';
import * as loggerModule from './logger';
import * as fileUtilModule from './common/file-util';
import * as executorModule from './executor';
import { handleResults, run } from './judo';

jest.mock('js-yaml');
jest.mock('fs');
jest.mock('child_process');

const STEP_FILE_PATH = 'tests/my-test.xml';
const PATH_1 = 'path1';
const NAME_1 = 'name1';
const PATH_2 = 'path2';
const NAME_2 = 'name2';
const PREREQ_COMMAND = 'echo "this is a prereq command"';
const NODE = 'node';
const JUDO_JS = 'judo.js';
const GOODBYE = 'goodbye';

const mockStepResultsPassed = [
  new StepResult({
    stepFilePath: PATH_1,
    stepName: NAME_1,
    passed: true,
    duration: 5
  }),
  new StepResult({
    stepFilePath: PATH_2,
    stepName: NAME_2,
    passed: true,
    duration: 10
  })
];

const mockStepResultsFailed = [
  new StepResult({
    stepFilePath: PATH_1,
    stepName: NAME_1,
    passed: false,
    duration: 5
  }),
  new StepResult({
    stepFilePath: PATH_2,
    stepName: NAME_2,
    passed: false,
    duration: 10
  })
];

const mockStepResultsOnePassOneFail = [
  new StepResult({
    stepFilePath: PATH_1,
    stepName: NAME_1,
    passed: true,
    duration: 5
  }),
  new StepResult({
    stepFilePath: PATH_2,
    stepName: NAME_2,
    passed: false,
    duration: 10
  })
];

const mockStepFileSingle = {
  run: {
    helloWorld: {
      prerequisites: [PREREQ_COMMAND],
      command: 'echo "hello world!"',
      expectCode: 0,
      outputContains: [
        // this makes it pass
        'hello'
      ],
      outputDoesntContain: [GOODBYE]
    }
  }
};

const mockStepFileTwo = {
  run: {
    helloWorldAgain: {
      prerequisites: [PREREQ_COMMAND],
      command: 'echo "hello again world!"',
      expectCode: 0,
      outputContains: [
        // this makes it pass
        'hello'
      ],
      outputDoesntContain: [GOODBYE]
    },
    goodbyeWorld: {
      command: 'echo "goodbye world!"',
      expectCode: 0,
      outputContains: [
        // this makes it fail
        'hello'
      ],
      outputDoesntContain: [GOODBYE]
    }
  }
};

const mockStepFileSingleRegexFail = {
  run: {
    helloWorldRegexFail: {
      command: 'echo "hi regex!"',
      expectCode: 0,
      outputContains: [
        // this makes it fail
        '/leia organa/g'
      ],
      outputDoesntContain: ['/bye regex!/g']
    }
  }
};

const mockStepFileSingleRegexPass = {
  run: {
    helloWorldRegexPass: {
      command: 'echo "hi regex!"',
      expectCode: 0,
      outputContains: [
        // this makes it pass
        '/hi regex!/g'
      ],
      outputDoesntContain: ['/bye regex!/g']
    }
  }
};

const helloWorldMockExecuteOutput = { output: 'hello world!', code: 0 };
const helloWorldAgainMockExecuteOutput = {
  output: 'hello again world!',
  code: 0
};
const goodbyeWorldMockExecuteOutput = { output: 'goodbye world!', code: 0 };
const helloWorldRegexMockExecuteOutput = { output: 'hi regex!', code: 0 };

// mock out all logger methods
const mockLogger = () => {
  loggerModule.logger.lineBreak = jest.fn();
  loggerModule.logger.info = jest.fn();
  loggerModule.logger.summary = jest.fn();
  loggerModule.logger.success = jest.fn();
  loggerModule.logger.error = jest.fn();
};

describe('judo', () => {
  beforeEach(() => {
    mockLogger();
    global.process.exit = jest.fn();
  });

  describe('handleResults', () => {
    it('logs success and exits with 0 if no failed tests', () => {
      const stepResults = mockStepResultsPassed;

      handleResults({ stepResults });

      expect(loggerModule.logger.success).toHaveBeenCalledTimes(2);
      expect(loggerModule.logger.error).toHaveBeenCalledTimes(0);
      expect(global.process.exit).toHaveBeenCalledWith(0);
    });

    it('logs error and exits with 1 if no passed tests', () => {
      const stepResults = mockStepResultsFailed;

      handleResults({ stepResults });

      expect(loggerModule.logger.success).toHaveBeenCalledTimes(0);
      expect(loggerModule.logger.error).toHaveBeenCalledTimes(2);
      expect(global.process.exit).toHaveBeenCalledWith(1);
    });

    it('logs success and error and exits with 1 if both passed and failed tests', () => {
      const stepResults = mockStepResultsOnePassOneFail;

      handleResults({ stepResults });

      expect(loggerModule.logger.success).toHaveBeenCalledTimes(1);
      expect(loggerModule.logger.error).toHaveBeenCalledTimes(1);
      expect(global.process.exit).toHaveBeenCalledWith(1);
    });

    it('logs overall summary of total tests, total duration, and num passed and failed', () => {
      const stepResults = mockStepResultsOnePassOneFail;
      mockLogger();
      global.process.exit = jest.fn();

      handleResults({ stepResults });

      expect(loggerModule.logger.summary).toHaveBeenCalledWith(
        'Total tests: ' + 2 + ' (' + 0.015 + 's)'
      );
      expect(loggerModule.logger.summary).toHaveBeenCalledWith(
        'Passed:      ' + 1
      );
      expect(loggerModule.logger.summary).toHaveBeenCalledWith(
        'Failed:      ' + 1
      );
    });
  });

  describe('run', () => {
    it('logs error and exits if process not given an argument', () => {
      global.process.argv = [NODE, JUDO_JS];
      global.process.exit = jest.fn();
      fileUtilModule.isFile = () => true;
      loggerModule.logger.error = jest.fn();

      run();

      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        'yaml file or directory path required as argument (ex: judo tests/)'
      );
      expect(global.process.exit).toHaveBeenCalledWith(1);
    });

    describe('invalid path given', () => {
      it('logs error and exits with code 1 if invalid path given', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH];
        fileUtilModule.isFile = jest.fn(() => false);
        fileUtilModule.isDirectory = jest.fn(() => false);
        yaml.safeLoad = jest.fn(path => {});

        await run();

        expect(yaml.safeLoad).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.success).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('Unrecognized file/directory path provided')
        );
      });
    });

    describe('run single file', () => {
      beforeEach(() => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH];
        fileUtilModule.isFile = jest.fn(() => true);
        fileUtilModule.isDirectory = jest.fn(() => false);
      });
      it('runs a single step file if process arguments is a file path, runs the one step in that file, and fails test if a prerequisite command fails', async () => {
        yaml.safeLoad = jest.fn(path => mockStepFileSingle);
        const mockError = new Error('lol no');
        executorModule.executePrerequisites = jest.fn(async () => {
          throw mockError;
        });
        executorModule.execute = jest.fn(async () => {});

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(1);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.success).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "helloWorld"')
        );
      });
      it('runs a single step file if process arguments is a file path, runs the one step in that file, and passes if pass', async () => {
        yaml.safeLoad = jest.fn(path => mockStepFileSingle);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest.fn(
          async () => helloWorldMockExecuteOutput
        );

        await run();

        expect(fileUtilModule.isFile).toHaveBeenCalledTimes(1);
        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(1);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello world!'],
          {
            argsString: '"hello world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorld"')
        );
        expect(loggerModule.logger.error).toHaveBeenCalledTimes(0);
      });
      it('runs a single step file if process arguments is a file path, runs the two steps in that file, and fails when one test fails, one test passes', async () => {
        yaml.safeLoad = jest.fn(path => mockStepFileTwo);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest
          .fn()
          .mockImplementationOnce(async () => helloWorldAgainMockExecuteOutput)
          .mockImplementationOnce(async () => goodbyeWorldMockExecuteOutput);

        await run();

        expect(fileUtilModule.isFile).toHaveBeenCalledTimes(1);
        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(1);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(2);
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello again world!'],
          {
            argsString: '"hello again world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['goodbye world!'],
          {
            argsString: '"goodbye world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorldAgain"')
        );
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "goodbyeWorld"')
        );
      });

      it('runs a single step file with a regex "outputContains" check and fails if regex doesnt match', async () => {
        yaml.safeLoad = jest.fn(path => mockStepFileSingleRegexFail);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest.fn(
          async () => helloWorldRegexMockExecuteOutput
        );

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(0);
        expect(executorModule.execute).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hi regex!'],
          {
            argsString: '"hi regex!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "helloWorldRegexFail"')
        );
      });

      it('runs a single step file with a regex "outputContains" check and passes if regex does match', async () => {
        yaml.safeLoad = jest.fn(path => mockStepFileSingleRegexPass);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest.fn(
          async () => helloWorldRegexMockExecuteOutput
        );

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(0);
        expect(executorModule.execute).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hi regex!'],
          {
            argsString: '"hi regex!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorldRegexPass"')
        );
        expect(loggerModule.logger.error).toHaveBeenCalledTimes(0);
      });
      it('runs a single step file with invalid yaml', async () => {
        yaml.safeLoad = jest.fn(() => new Error('invalid parsing'));
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest.fn();

        await run();

        expect(executorModule.execute).toHaveBeenCalledTimes(0);
        expect(global.process.exit).toHaveBeenCalledWith(1);
        expect(loggerModule.logger.error).toHaveBeenCalledTimes(1);
      });

      it('when a step is passed as arg, runs a single step file with execution of ONLY the step passed', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH, 'goodbyeWorld'];
        yaml.safeLoad = jest.fn(path => mockStepFileTwo);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest
          .fn()
          .mockImplementationOnce(async () => goodbyeWorldMockExecuteOutput);

        await run();

        expect(fileUtilModule.isFile).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['goodbye world!'],
          {
            argsString: '"goodbye world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "goodbyeWorld"')
        );
      });

      it('when an invalid arg is passed as step name for execution, no steps run in the file', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH, 'invalid'];
        yaml.safeLoad = jest.fn(path => mockStepFileTwo);
        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest.fn();

        await run();

        expect(fileUtilModule.isFile).toHaveBeenCalledTimes(1);
        expect(executorModule.execute).toHaveBeenCalledTimes(0);
        expect(loggerModule.logger.error).toHaveBeenCalledTimes(0);
      });
    });
    describe('run directory of files', () => {
      it('runs two step files if process arguments is a directory path containing two files, runs the two steps in those files, and passes if all pass', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH];
        fileUtilModule.isFile = jest.fn(() => false);
        fileUtilModule.isDirectory = jest.fn(() => true);
        fileUtilModule.listFilesRecursively = () => [
          'filea.yml',
          'somdir/fileb.yml'
        ];
        yaml.safeLoad = jest
          .fn()
          .mockImplementationOnce(path => mockStepFileSingle)
          .mockImplementationOnce(path => mockStepFileTwo);

        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest
          .fn()
          .mockImplementationOnce(async () => helloWorldMockExecuteOutput)
          .mockImplementationOnce(async () => helloWorldAgainMockExecuteOutput)
          .mockImplementationOnce(async () => goodbyeWorldMockExecuteOutput);

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(2);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(3); // helloWorld, helloWorldAgain, goodbyeWorld
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello world!'],
          {
            argsString: '"hello world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello again world!'],
          {
            argsString: '"hello again world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['goodbye world!'],
          {
            argsString: '"goodbye world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorld"')
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorldAgain"')
        );
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "goodbyeWorld"')
        );
      });
      it('runs two step files if process arguments is a directory path containing two JSON files, runs the two steps in those files, and passes if all pass', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH, '--includejsonfiles'];
        fileUtilModule.isFile = jest.fn(() => false);
        fileUtilModule.isDirectory = jest.fn(() => true);
        fileUtilModule.listFilesRecursively = () => [
          'filea.json',
          'somdir/fileb.json'
        ];
        yaml.safeLoad = jest
          .fn()
          .mockImplementationOnce(path => mockStepFileSingle)
          .mockImplementationOnce(path => mockStepFileTwo);

        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest
          .fn()
          .mockImplementationOnce(async () => helloWorldMockExecuteOutput)
          .mockImplementationOnce(async () => helloWorldAgainMockExecuteOutput)
          .mockImplementationOnce(async () => goodbyeWorldMockExecuteOutput);

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(2);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(3); // helloWorld, helloWorldAgain, goodbyeWorld
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello world!'],
          {
            argsString: '"hello world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello again world!'],
          {
            argsString: '"hello again world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['goodbye world!'],
          {
            argsString: '"goodbye world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorld"')
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorldAgain"')
        );
        expect(loggerModule.logger.error).toHaveBeenCalledWith(
          expect.stringContaining('FAILED "goodbyeWorld"')
        );
      });
      it('logs error and exits with code 1 if error occurs running step file', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH];
        fileUtilModule.isFile = jest.fn(() => false);
        fileUtilModule.isDirectory = jest.fn(() => true);
        fileUtilModule.listFilesRecursively = () => [
          'filea.yml',
          'somdir/fileb.yml'
        ];
        yaml.safeLoad = jest.fn(() => new Error('not on my watch'));
        executorModule.execute = jest.fn();

        await run();

        expect(executorModule.execute).toHaveBeenCalledTimes(0);
        expect(global.process.exit).toHaveBeenCalledWith(1);
        expect(loggerModule.logger.error).toHaveBeenCalledTimes(2);
      });

      it('when multiple steps are passed for execution, runs ONLY the steps passed in args across the files in the directory', async () => {
        global.process.argv = [NODE, JUDO_JS, STEP_FILE_PATH, 'helloWorld', 'helloWorldAgain'];
        fileUtilModule.isFile = jest.fn(() => false);
        fileUtilModule.isDirectory = jest.fn(() => true);
        fileUtilModule.listFilesRecursively = () => [
          'filea.yml',
          'somdir/fileb.yml'
        ];
        yaml.safeLoad = jest
          .fn()
          .mockImplementationOnce(path => mockStepFileSingle)
          .mockImplementationOnce(path => mockStepFileTwo);

        executorModule.executePrerequisites = jest.fn(async () => {});
        executorModule.execute = jest
          .fn()
          .mockImplementationOnce(async () => helloWorldMockExecuteOutput)
          .mockImplementationOnce(async () => helloWorldAgainMockExecuteOutput);

        await run();

        expect(executorModule.executePrerequisites).toHaveBeenCalledTimes(2);
        expect(executorModule.executePrerequisites).toHaveBeenCalledWith({
          prerequisites: [PREREQ_COMMAND],
          cwd: undefined
        });
        expect(executorModule.execute).toHaveBeenCalledTimes(2); // helloWorld, helloWorldAgain
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello world!'],
          {
            argsString: '"hello world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(executorModule.execute).toHaveBeenCalledWith(
          'echo',
          ['hello again world!'],
          {
            argsString: '"hello again world!"',
            cwd: undefined,
            when: [],
            timeout: 120000
          }
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorld"')
        );
        expect(loggerModule.logger.success).toHaveBeenCalledWith(
          expect.stringContaining('PASSED "helloWorldAgain"')
        );
      });
    });
  });
});
