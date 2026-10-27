import z from 'zod';

/**
 * Zod default messages in plain Spanish, for the people who read them in the app.
 * Messages written in a schema (`z.string().min(1, 'El motivo es obligatorio')`) still win.
 * Anything not covered here falls back to Zod's own Spanish locale.
 */
const zodSpanish = z.locales.es().localeError!;

type Issue = Parameters<typeof zodSpanish>[0];

const TYPE_MESSAGES: Record<string, string> = {
  number: 'Debe ser un número',
  int: 'Debe ser un número entero',
  string: 'Debe ser un texto',
  boolean: 'Debe ser sí o no',
  array: 'Debe ser una lista',
  date: 'Debe ser una fecha válida',
};

const FORMAT_MESSAGES: Record<string, string> = {
  uuid: 'El identificador no es válido',
  guid: 'El identificador no es válido',
  email: 'El correo no es válido',
  datetime: 'La fecha no es válida',
  date: 'La fecha no es válida',
  time: 'La hora no es válida',
  url: 'El enlace no es válido',
};

const isNumeric = (origin: string) => ['number', 'int', 'bigint'].includes(origin);

export function plainSpanishError(issue: Issue): string | undefined {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) return 'Este dato es obligatorio';
      return TYPE_MESSAGES[issue.expected] ?? 'El dato no es válido';

    case 'too_small': {
      const min = String(issue.minimum);
      if (isNumeric(issue.origin)) return issue.inclusive ? `Debe ser ${min} o más` : `Debe ser mayor que ${min}`;
      if (issue.origin === 'string') return min === '1' ? 'No puede quedar vacío' : `Debe tener al menos ${min} caracteres`;
      if (issue.origin === 'array') return min === '1' ? 'Agrega al menos uno' : `Agrega al menos ${min}`;
      if (issue.origin === 'date') return 'La fecha es demasiado antigua';
      break;
    }

    case 'too_big': {
      const max = String(issue.maximum);
      if (isNumeric(issue.origin)) return issue.inclusive ? `Debe ser ${max} o menos` : `Debe ser menor que ${max}`;
      if (issue.origin === 'string') return `Puede tener hasta ${max} caracteres`;
      if (issue.origin === 'array') return `Puede tener hasta ${max}`;
      if (issue.origin === 'date') return 'La fecha es demasiado lejana';
      break;
    }

    case 'not_multiple_of':
      return issue.divisor === 0.01 ? 'Usa como máximo dos decimales' : `Debe ser múltiplo de ${issue.divisor}`;

    case 'invalid_format':
      return FORMAT_MESSAGES[issue.format] ?? 'El formato no es válido';

    case 'invalid_value':
      return 'Elige una opción válida';

    case 'unrecognized_keys':
      return 'Se enviaron datos que no se esperaban';

    case 'invalid_union':
    case 'invalid_key':
    case 'invalid_element':
      return 'El dato no es válido';
  }
  return undefined;
}

z.config({
  localeError: issue => plainSpanishError(issue) ?? zodSpanish(issue),
});
