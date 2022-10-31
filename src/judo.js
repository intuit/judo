#!/usr/bin/env node

import { parse as parseSpawnArgs } from 'parse-spawn-args';
import assert from 'assert';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { execute, executePrerequisites } from './executor';
import { listFilesRecursively, isFile, isDirectory } from './common/file-util';
import { truncateAfterDecimal } from './common/number-util';
import { StepResult } from './models/StepResult';
import { getReporter } from './reporters/get-reporter';
import stringToRegexp from 'string-to-regexp';
import mustache from 'mustache';
import refResolver from 'json-refs';
import yargs from 'yargs';

/**
 * Main run function to initiate Judo. Discovers all files from provided CLI option,
 * runs tests in each file, and handles the results.
 */
const run = async () => {
  let argv = yargs(process.argv.slice(2)).argv;
  const yamlFilePath = argv._[0];
  const inputSteps = argv._.slice(1);

  let options = {
    timeout: 120000,
    junitReport: false
  };

  // gather options flags
  if (argv.timeout !== undefined || argv.t !== undefined) {
    options.timeout = (argv.timeout !== undefined) ? argv.timeout : argv.t;
  }
  if (argv.junitreport || argv.j) {
    options.junitReport = true;
  }
  if (argv.includejsonfiles || (argv.i && argv.j)) {
    options.includeJSONFiles = true;
  }

  if (!yamlFilePath) {
    logger.error(
      'yaml file or directory path required as argument (ex: judo tests/)'
    );
    process.exit(1);
  }

  if (isFile(yamlFilePath)) {
    // if argument is a file, just run that file
    try {
      const { stepResults } = await runStepFile(yamlFilePath, inputSteps, options);
      return handleResults({ stepResults });
    } catch (e) {
      logger.error(new Error(`Failed to run step file: ${e}`));
      process.exit(1);
    }
  } else if (isDirectory(yamlFilePath)) {
    // if argument is a directory, run against all files in that dir and subdirs recursively
    const allStepFiles = listFilesRecursively(yamlFilePath).filter(
      file => file.indexOf('.yml') !== -1 || (options.includeJSONFiles && file.indexOf('.json') !== -1)
    );
    const numStepFiles = allStepFiles.length;

    logger.info(`Found ${numStepFiles} tests in ${yamlFilePath}`);

    let numStepFilesComplete = 0;
    let currentStepFileIndex = 0;
    let allStepResults = [];

    const recurse = async thisStepFilePath => {
      try {
        const { stepResults } = await runStepFile(thisStepFilePath, inputSteps, options);
        allStepResults = allStepResults.concat(stepResults);

        numStepFilesComplete++;
        currentStepFileIndex++;

        // check if done with all files
        if (numStepFilesComplete === numStepFiles) {
          const reporter = getReporter({ options: options, stepResults: allStepResults });
          if (reporter) {
            fs.writeFileSync(reporter.outputFile, reporter.generateReport());
          }
          return handleResults({ stepResults: allStepResults });
        }

        return recurse(allStepFiles[currentStepFileIndex]);
      } catch (e) {
        throw new Error(`Failed to run step file ${thisStepFilePath}: ${e}`);
      }
    };

    try {
      await recurse(allStepFiles[currentStepFileIndex]);
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }
  } else {
    logger.error('Unrecognized file/directory path provided');
    process.exit(1);
  }
};

/**
 * Runs all of the run steps in a single YAML step file ("test scenario").
 * @param {String} yamlFilePath
 * @param {Object} options        options object. contains "timeout"
 */
const runStepFile = async (yamlFilePath, stepsToExecute, options) => {
  const fileContents = fs.readFileSync(yamlFilePath);
  let runSteps = {};
  // first step for every file is gonna be parse itself
  let runStepNames = [];
  try {
    const yamlFile = yaml.safeLoad(fileContents, 'utf8');
    const { resolved } = await refResolver.resolveRefs(yamlFile, {
      location: path.dirname(yamlFilePath)
    });
    // logger.info('Running step file: ' + yamlFilePath);
    runSteps = resolved.run;
    runStepNames = Object.keys(runSteps);
    if (resolved.vars) {
      const view = resolved.vars;
      mustache.escape = text => text;
      const resolveVars = obj => {
        Object.keys(obj).forEach((key) => {
          if (typeof obj[key] === 'string') {
            obj[key] = mustache.render(obj[key], view);
          } else if (typeof obj[key] === 'object') {
            resolveVars(obj[key]);
          }
        });
      };
      resolveVars(runSteps);
    }
  } catch (e) {
    logger.error(`YAML PARSER FAILED on file ${yamlFilePath}: ${e.message}`);
    process.exit(1);
  }

  // if there are specific steps mentioned by user, then filter out only those steps for execution
  if (stepsToExecute.length > 0) {
    runStepNames = runStepNames.filter(val => stepsToExecute.includes(val));
  }

  const numTotal = runStepNames.length;
  const thisStepFileResults = [];
  // if there are no steps to execute, then return empty
  if (numTotal === 0) {
    return { stepResults: thisStepFileResults };
  }

  let currentStepIndex = 0;
  let numComplete = 0;

  const recurse = async runStep => {
    const stepName = runStepNames[currentStepIndex];
    const thisStepResult = new StepResult({
      stepFilePath: yamlFilePath,
      stepName
    });

    logger.info(`Executing run step: ${stepName}`);
    const startTime = new Date();

    try {
      await executeRunStep(stepName, runSteps[stepName], options);
      const endTime = new Date();
      thisStepResult.setDuration(endTime - startTime);
      thisStepResult.setPassed(true);
      const time = truncateAfterDecimal(thisStepResult.getDuration(), 5);
      logger.success(`PASSED "${stepName}" (${time}ms)`);
    } catch (e) {
      const endTime = new Date();
      thisStepResult.setDuration(endTime - startTime);
      const time = truncateAfterDecimal(thisStepResult.getDuration(), 5);
      logger.error(`FAILED "${stepName}": ${e.message} (${time}ms)`);
      thisStepResult.setPassed(false);
      thisStepResult.setErrorMessage(e.message);
    }

    thisStepFileResults.push(thisStepResult);
    numComplete++;
    currentStepIndex++;

    if (numComplete < numTotal) {
      return recurse(runSteps[currentStepIndex]);
    } else {
      return { stepResults: thisStepFileResults };
    }
  };

  return recurse(runSteps[currentStepIndex]);
};

/**
 * Runs a single run step, along with its prerequisites.
 * @param {String} stepName the name of this step, as defined in the step file ("test scenario")
 * @param {Object} runStep run step JSON object from parsing the YAML step file ("test scenario")
 * @param {Object} options  options object
 */
const executeRunStep = async (stepName, runStep, { timeout }) => {
  const commandString = runStep.command;
  const commandSplit = commandString.split(' ');
  const command = commandSplit[0];
  const args = commandSplit.slice(1);
  const argsString = args.join(' ');
  const parsedAndCleanArgs = parseSpawnArgs(argsString);
  const cwd = runStep.cwd;
  const prerequisiteCwd = runStep.prerequisiteCwd;
  const prerequisites = runStep.prerequisites || [];
  const when = runStep.when || [];
  const expectCode = runStep.expectCode || 0;
  const outputContains = runStep.outputContains || [];
  const outputDoesntContain = runStep.outputDoesntContain || [];

  if (prerequisites && prerequisites.length) {
    await executePrerequisites({ prerequisites, cwd: prerequisiteCwd });
  }

  try {
    const { output, code } = await execute(command, parsedAndCleanArgs || [], {
      cwd,
      argsString,
      timeout,
      when: when.map(thisStep => {
        const output = Object.keys(thisStep)[0];
        const response = thisStep[output];

        return {
          output,
          response
        };
      })
    });

    assert.equal(
      code,
      expectCode,
      `Expected exit code: ${expectCode}, received: ${code}`
    );

    outputContains.forEach(expectedOutput => {
      const isRegex = expectedOutput.indexOf('/') === 0;

      if (isRegex) {
        assert.equal(
          true,
          stringToRegexp(expectedOutput).test(output),
          `Expected output to match regex: ${expectedOutput}`
        );
      } else {
        assert.equal(
          true,
          output.indexOf(expectedOutput) !== -1,
          `Expected output to contain: ${expectedOutput}`
        );
      }
    });

    outputDoesntContain.forEach(notExpectedOutput => {
      const isRegex = notExpectedOutput.indexOf('/') === 0;

      if (isRegex) {
        assert.equal(
          false,
          stringToRegexp(notExpectedOutput).test(output),
          `Expected output to not match regex: ${notExpectedOutput}`
        );
      } else {
        assert.equal(
          true,
          output.indexOf(notExpectedOutput) === -1,
          `Expected output to NOT contain: ${notExpectedOutput}`
        );
      }
    });
  } catch (e) {
    throw new Error(e.message || 'No error message, check [OUTPUT] logs.');
  }
};

/**
 * Handles the results of all test suites and scenarios after Judo is done running. Logs results
 * to console and exits with the correct code.
 * @param {*} param0
 */
const handleResults = ({ stepResults }) => {
  logger.lineBreak();
  logger.summary('============= JUDO TESTS COMPLETE =============');

  let numPassed = 0;
  let numFailed = 0;
  let totalDurationMs = 0;
  let previousStepFilePath = '';

  stepResults.forEach(stepResult => {
    if (stepResult.getStepFilePath() !== previousStepFilePath) {
      logger.summary(stepResult.getStepFilePath());
      previousStepFilePath = stepResult.getStepFilePath();
    }

    const name = stepResult.getStepName();
    const time = truncateAfterDecimal(stepResult.getDuration() / 1000, 5);

    if (stepResult.getPassed()) {
      logger.success(`PASSED: ${name} (${time}s)`);
      numPassed++;
    } else {
      logger.error(`FAILED: ${name} (${time}s)`);
      numFailed++;
    }

    totalDurationMs += stepResult.getDuration();
  });

  logger.summary(
    `Total tests: ${stepResults.length} (${truncateAfterDecimal(
      totalDurationMs / 1000,
      5
    )}s)`
  );
  logger.summary(`Passed:      ${numPassed}`);
  logger.summary(`Failed:      ${numFailed}`);

  if (numFailed !== 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

if (process.env.NODE_ENV !== 'test') {
  run();
}

export {
  handleResults,
  run
};
