const POSTGRES_UNDEFINED_TABLE_ERROR_CODE = '42P01';

const getStringProperty = (value: unknown, key: string): string | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const propertyValue = Reflect.get(value, key);
  return typeof propertyValue === 'string' ? propertyValue : null;
};

export const isUndefinedTableError = (error: unknown, relationName?: string): boolean => {
  const errorCode = getStringProperty(error, 'code');
  const errorMessage = getStringProperty(error, 'message');

  if (errorCode === POSTGRES_UNDEFINED_TABLE_ERROR_CODE) {
    if (!relationName) {
      return true;
    }

    if (errorMessage) {
      return errorMessage.includes(`relation "${relationName}" does not exist`);
    }

    return true;
  }

  if (relationName && errorMessage) {
    return errorMessage.includes(`relation "${relationName}" does not exist`);
  }

  return false;
};
