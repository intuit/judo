import { StepResult } from './StepResult';

describe('StepResult', () => {
  it('constructs with no parameters', () => {
    const stepResult = new StepResult();
    expect(stepResult.getStepName()).toBeUndefined();
  });
  it('uses it setters and getters correctly', () => {
    const stepResult = new StepResult({
      stepFilePath: 'some file path',
      stepName: 'some step name',
      passed: true,
      duration: 5
    });

    stepResult.setStepFilePath('another file path');
    stepResult.setStepName('some other step name');
    expect(stepResult.getStepFilePath()).toEqual('another file path');
    expect(stepResult.getStepName()).toEqual('some other step name');
  });
});
