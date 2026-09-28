export function catchError(fn: () => unknown): Error {
  try {
    fn()
  } catch (error) {
    if (error instanceof Error) return error
    throw new Error('Expected an Error instance to be thrown', { cause: error })
  }
  throw new Error('Expected the function to throw')
}

export async function catchRejection(promise: Promise<unknown>): Promise<Error> {
  const reason: unknown = await promise.then(
    () => {
      throw new Error('Expected the promise to reject')
    },
    (error: unknown) => error,
  )
  if (reason instanceof Error) return reason
  throw new Error('Expected an Error instance as the rejection reason', { cause: reason })
}
