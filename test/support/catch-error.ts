export function catchError(fn: () => unknown): Error {
  try {
    fn()
  } catch (error) {
    if (error instanceof Error) return error
    throw new Error('Expected an Error instance to be thrown', { cause: error })
  }
  throw new Error('Expected the function to throw')
}
