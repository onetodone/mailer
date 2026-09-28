// The Standard Schema v1 interface (https://standardschema.dev), copied as the
// spec allows, so no dependency is needed. Flattened into plain interfaces
// because namespaces are not used in this codebase.

/** A schema from any library that implements Standard Schema v1, such as zod 4, valibot or arktype. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1Props<Input, Output>
}

/** The Standard Schema properties. */
export interface StandardSchemaV1Props<Input = unknown, Output = Input> {
  readonly version: 1
  readonly vendor: string
  readonly validate: (value: unknown) => StandardSchemaV1Result<Output> | Promise<StandardSchemaV1Result<Output>>
  readonly types?: StandardSchemaV1Types<Input, Output> | undefined
}

/** The result of `validate`. */
export type StandardSchemaV1Result<Output> =
  { readonly value: Output; readonly issues?: undefined } | { readonly issues: readonly StandardSchemaV1Issue[] }

/** One validation problem. */
export interface StandardSchemaV1Issue {
  readonly message: string
  readonly path?: readonly (PropertyKey | { readonly key: PropertyKey })[] | undefined
}

/** Types the schema accepts and produces. */
export interface StandardSchemaV1Types<Input = unknown, Output = Input> {
  readonly input: Input
  readonly output: Output
}
