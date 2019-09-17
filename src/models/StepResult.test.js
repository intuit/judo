import { StepResult } from './StepResult';

describe('StepResult', () => {
  it('uses it setters and getters correctly', () => {
    const stepResult = new StepResult({
      stepFilePath: 'some file path',
      stepName: 'some step name',
      passed: true,
      duration: 5
    });

    stepResult.setStepFilePath('another file path');
    expect(stepResult.getStepFilePath()).toEqual('another file path');
  });
});
