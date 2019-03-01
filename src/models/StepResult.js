class StepResult {
  constructor ({ stepFilePath, stepName, passed, duration, errorMessage } = {}) {
    this.stepFilePath = stepFilePath;
    this.stepName = stepName;
    this.passed = passed;
    this.duration = duration;
    this.errorMessage = errorMessage;

    return this;
  }

  setStepFilePath (path) {
    this.stepFilePath = path;
    return this;
  }

  getStepFilePath () {
    return this.stepFilePath;
  }

  setStepName (name) {
    this.stepName = name;
    return this;
  }

  getStepName () {
    return this.stepName;
  }

  setPassed (passed) {
    this.passed = passed;
    return this;
  }

  getPassed () {
    return this.passed;
  }

  setDuration (duration) {
    this.duration = duration;
    return this;
  }

  getDuration () {
    return this.duration;
  }

  setErrorMessage (errorMessage) {
    this.errorMessage = errorMessage;
    return this;
  }

  getErrorMessage () {
    return this.errorMessage;
  }
}

export { StepResult };
