export const number = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 })
export const percent = (value: number) => `${number(value)}%`
export const hours = (value: number | null) =>
  value === null ? 'No data' : `${number(value)} h`
