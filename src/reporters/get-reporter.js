import { XunitReporter } from './XunitReporter';

const getReporter = ({ options, stepResults }) => {
  if (options.junitReport) {
    return new XunitReporter({ stepResults });
  } else {
    return null;
  }
};

export {
  getReporter
};
