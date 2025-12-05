export const snakeToCamel = <T = any>(input: any): T => {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map(item => snakeToCamel(item)) as any;
  }

  if (typeof input === "object" && input.constructor === Object) {
    const camelObj: any = {};

    for (const key in input) {
      const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      camelObj[camelKey] = snakeToCamel(input[key])
    }

    return camelObj as T;
  }

  return input;
}