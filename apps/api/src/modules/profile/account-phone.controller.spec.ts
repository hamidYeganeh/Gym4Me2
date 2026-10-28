import { ForbiddenException } from '@nestjs/common';
import { AccountPhoneController } from './account-phone.controller';
describe('phone numbers are immutable while changes are disabled', () => {
  const controller = new AccountPhoneController();
  it('rejects both new change requests and previously issued challenges', () => {
    expect(() => controller.request()).toThrow(ForbiddenException);
    expect(() => controller.verify()).toThrow(ForbiddenException);
  });
});
