import { ReporterInterface } from './ReporterInterface';
import { truncateAfterDecimal } from '../common/number-util';

class XunitReporter extends ReporterInterface {
  constructor ({ stepResults }) {
    super({
      stepResults,
      type: 'XUnit',
      outputFile: './junit.xml'
    });
  }
  generateReport () {
    let previousStepFilePath = '';

    let xml = '';
    xml += `<testsuites name="Judo Tests">\n`;
    this.stepResults.forEach(stepResult => {
      if (stepResult.getStepFilePath() !== previousStepFilePath) {
        if (previousStepFilePath !== '') {
          xml += `   </testsuite>\n`;
        }
        xml += `   <testsuite name="${stepResult.getStepFilePath()}">\n`;
        previousStepFilePath = stepResult.getStepFilePath();
      }
      xml += `      <testcase name="${stepResult.getStepName()}" time="${truncateAfterDecimal(stepResult.getDuration() / 1000, 5)}">\n`;
      if (!stepResult.getPassed()) {
        xml += `         <failure message="${stepResult.getErrorMessage()}"></failure>\n`;
      }
      xml += `      </testcase>\n`;
    });
    xml += `   </testsuite>\n</testsuites>`;
    return xml;
  }
}

export {
  XunitReporter
};
