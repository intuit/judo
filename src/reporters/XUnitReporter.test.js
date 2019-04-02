import { StepResult } from '../models/StepResult';
import { XunitReporter } from './XunitReporter';

const mockStepResultsPassed = [
  new StepResult({
    stepFilePath: 'path1',
    stepName: 'name1',
    passed: true,
    duration: 5
  }),
  new StepResult({
    stepFilePath: 'path2',
    stepName: 'name2',
    passed: true,
    duration: 10
  })
];

const mockStepResultsFailed = [
  new StepResult({
    stepFilePath: 'path1',
    stepName: 'name1',
    passed: false,
    duration: 5
  }),
  new StepResult({
    stepFilePath: 'path2',
    stepName: 'name2',
    passed: false,
    duration: 10
  })
];

describe('junitResults', () => {
  it('reports successful results', () => {
    const stepResults = mockStepResultsPassed;

    const xml = new XunitReporter({ stepResults }).generateReport();

    expect(xml).toEqual('<testsuites name="Judo Tests">\n   <testsuite name="path1">\n      <testcase name="name1" time="0.005">\n      </testcase>\n   </testsuite>\n   <testsuite name="path2">\n      <testcase name="name2" time="0.01">\n      </testcase>\n   </testsuite>\n</testsuites>');
  });

  it('reports the error message for a failed test', () => {
    const stepResults = mockStepResultsFailed;

    const xml = new XunitReporter({ stepResults }).generateReport();

    expect(xml).toEqual('<testsuites name="Judo Tests">\n   <testsuite name="path1">\n      <testcase name="name1" time="0.005">\n         <failure message="undefined"></failure>\n      </testcase>\n   </testsuite>\n   <testsuite name="path2">\n      <testcase name="name2" time="0.01">\n         <failure message="undefined"></failure>\n      </testcase>\n   </testsuite>\n</testsuites>');
  });
});
