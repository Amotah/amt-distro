import { describe, expect, it } from 'vitest';
import { buildPasswordChangeUpdate } from './password-update';

describe('buildPasswordChangeUpdate', () => {
  it('disables forced password change flags immediately when a password is set', () => {
    expect(buildPasswordChangeUpdate({
      password: 'NewStrongPass!1',
      mustChangePassword: true,
      temporaryPassword: true,
    })).toEqual({
      password: 'NewStrongPass!1',
      metadataOverrides: {
        mustChangePassword: false,
        temporaryPassword: false,
      },
    });
  });

  it('keeps metadata flags when no password change is requested', () => {
    expect(buildPasswordChangeUpdate({
      mustChangePassword: true,
      temporaryPassword: false,
    })).toEqual({
      password: undefined,
      metadataOverrides: {
        mustChangePassword: true,
        temporaryPassword: false,
      },
    });
  });
});
