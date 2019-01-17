const truncate = (number, length) => {
  const str = number.toString();
  let truncateLength = length;

  if (str.indexOf('.') !== -1) {
    truncateLength += 1;
  }

  const truncated = str.slice(0, truncateLength);

  return parseFloat(truncated);
};

const truncateAfterDecimal = (number, digits) => {
  const re = new RegExp('(\\d+\\.\\d{' + digits + '})(\\d)');
  const m = number.toString().match(re);

  return m ? parseFloat(m[1]) : number.valueOf();
};

export {
  truncate,
  truncateAfterDecimal
};
