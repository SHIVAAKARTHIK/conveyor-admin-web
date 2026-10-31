/** A patient has no bed until a nurse assigns one (the record holds an empty string). */
export function bedLabel(bed: string | null | undefined): string {
  return bed ? `Bed ${bed}` : "no bed yet";
}
