export type PasswordChangeInput = {
  password?: string;
  mustChangePassword?: boolean;
  temporaryPassword?: boolean;
};

export function buildPasswordChangeUpdate(input: PasswordChangeInput) {
  const password = typeof input.password === 'string' ? input.password.trim() : undefined;
  const metadataOverrides: Record<string, boolean> = {};

  if (input.mustChangePassword !== undefined) {
    metadataOverrides.mustChangePassword = input.mustChangePassword;
  }

  if (input.temporaryPassword !== undefined) {
    metadataOverrides.temporaryPassword = input.temporaryPassword;
  }

  if (!password) {
    return {
      password: undefined,
      metadataOverrides,
    };
  }

  return {
    password,
    metadataOverrides: {
      ...metadataOverrides,
      mustChangePassword: false,
      temporaryPassword: false,
    },
  };
}
