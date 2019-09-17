// @ts-check

import { logger } from './logger';
import { exec, spawn } from 'child_process';

import path from 'path';

/**
 * Spawns a new process to execute all of the prerequisite commands provided.
 * @param {Object} params
 * @param {Array.<String>} params.prerequisites   strings of commands to run
 * @param {String} params.cwd                     directory to run the prereqs process in
 */
export const executePrerequisites = ({ prerequisites, cwd }) => {
  return new Promise((resolve, reject) => {
    logger.info(`Running prerequisite commands in: ${path.resolve(cwd)}`);

    const commandsChained = prerequisites.join(' && ');
    const child = exec(commandsChained, { cwd });

    child.stdout.on('data', data => {
      logger.logOutput(data.toString());
    });

    child.stderr.on('data', data => {
      logger.logOutput(data.toString());
    });

    child.on('close', code => {
      logger.info('Prerequisites complete');

      if (code !== 0) {
        return reject(
          new Error(`Failed to run prerequisites, exit code: ${code}`)
        );
      }

      return resolve();
    });
  });
};

// timeout to cancel execution if no command output is found within time limit
const startNoOutputTimeout = (timeout, commandStr, reject) =>
  setTimeout(
    () => reject(new Error(`Timeout of ${timeout}ms reached without any command output when running: "${commandStr}"`)),
    timeout
  );

/**
 * Spawns a new process to execute a command. Responds to any "when" responses specified in the opts by
 * sending the response to the new process' stdin. If every "when" is not found, rejects an error, otherwise
 * resolves.
 * @param {String} command       command to be run
 * @param {Array.<String>} args  args for the command
 * @param {Object} opts          node-pty spawn options, as well as "when" assertions and "timeout"
 */
export const execute = (command, args = [], opts = {}) => {
  return new Promise(async (resolve, reject) => {
    // argString?
    const commandArgs = opts.argsString || args.join(' ');
    const commandStr = `${command} ${commandArgs}`;
    const cwdStr = opts.cwd ? ` in ${path.resolve(opts.cwd)}` : '';

    const child = spawn(command, args, {
      ...opts,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    logger.info(`Executing: ${commandStr}${cwdStr}`);

    let timeoutControl = startNoOutputTimeout(opts.timeout, commandStr, reject);
    let output = '';
    let childInputWrite;

    const processOutput = (data) => {
      clearTimeout(timeoutControl);
      timeoutControl = startNoOutputTimeout(opts.timeout, commandStr, reject);
      output += data;

      if (opts.when) {
        opts.when.forEach(whenStep => {
          if (
            !childInputWrite &&
            data.indexOf(whenStep.output) !== -1 &&
            !whenStep.done
          ) {
            whenStep.done = true;
            // store response to send back to child stdin
            childInputWrite = whenStep.response + '\r';
          }
        });
      }
    };

    child.stdout.on('data', data => {
      const childData = data.toString();
      logger.logOutput(childData);
      processOutput(childData)
    })

    child.stderr.on('data', data => {
      const childData = data.toString();
      logger.logStderr(childData);
      processOutput(childData)
    });

    // write inputs to child process on an interval, avoids immediate execution race condition
    const interval = setInterval(() => {
      if (childInputWrite) {
        logger.info(`responding with: ${childInputWrite}`);
        child.stdin.write(childInputWrite);
        childInputWrite = '';
      }
    }, 500);

    // listen for end of process
    child.on('exit', code => {
      const numWhenAssertionsComplete = opts.when.filter(w => w.done).length;
      clearInterval(interval);

      logger.info(`exited: ${code}`);

      if (opts.when && numWhenAssertionsComplete < opts.when.length) {
        return reject(new Error(`Expected ${opts.when.length} different strings in output from run step "when", encountered ${numWhenAssertionsComplete} expected outputs`));
      }

      return resolve({ output, code });
    });
  });
};
