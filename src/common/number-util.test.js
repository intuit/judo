import { truncate, truncateAfterDecimal } from './number-util';

describe('number-util', () => {
  describe('truncate', () => {
    it('truncates numbers to two digits', () => {
      const number = truncate(12345, 2);
      expect(number).toEqual(12);
    });
    it('truncates decimal number', () => {
      const number = truncateAfterDecimal(12345.6789, 2);
      expect(number).toEqual(12345.67);
    });
  });
});
