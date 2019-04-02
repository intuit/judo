class ReporterInterface {
  /**
  *   @param {Object} params
  *   @param {Array} params.stepResults          list of step results after completion of tests
  *   @param {type} params.type                      type of this reporter
  *   @param {String} params.outputFile           file path that report is written to
  */
  constructor ({ stepResults, type, outputFile }) {
    this.stepResults = stepResults;
    this.type = type;
    this.outputFile = outputFile;
  }
  /**
  *
  * @returns {String} report file contents
  */
  generateReport () {
    throw new Error(`writeReport() not implemented for reporter ${this.type}`);
  }
}

export {
  ReporterInterface
};
