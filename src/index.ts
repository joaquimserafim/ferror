/** Represents a successful outcome, holding the value. */
export interface Ok<T> {
	readonly ok: true;
	readonly value: T;
	readonly error: undefined;
}

/** Represents a failed outcome, holding the error. */
export interface Err<E extends Error = Error> {
	readonly ok: false;
	readonly value: undefined;
	readonly error: E;
}

/**
 * A discriminated union type similar to Rust's Result<T, E>.
 * It is either a successful Ok<T> or a failed Err<E>.
 */
export type Result<T, E extends Error = Error> = Ok<T> | Err<E>;

/** Creates a successful result holding `value`. */
export function ok<T>(value: T): Ok<T> {
	return { ok: true, value, error: undefined };
}

/** Creates a failed result holding `error`. */
export function err<E extends Error>(error: E): Err<E> {
	return { ok: false, value: undefined, error };
}

/**
 * Normalizes a caught value into an Error instance.
 * Non-Error throws are wrapped in a new Error whose message stringifies
 * the thrown value and whose `cause` preserves it as-is.
 */
function toError(e: unknown): Error {
	return e instanceof Error
		? e
		: new Error(`Unknown error: ${String(e)}`, { cause: e });
}

/**
 * Wraps a promise — or a function returning one — so it never rejects or throws.
 * A successful resolution becomes an Ok result and a rejection becomes an Err
 * result. Passing a function also captures synchronous throws that happen
 * before a promise is created.
 *
 * Note: the `E` type parameter is an unchecked assertion — nothing validates
 * at runtime that the caught error actually is an `E`. Only narrow it when
 * you control everything the wrapped operation can throw.
 *
 * @param input The promise to wrap, or a function returning one.
 * @returns A Promise resolving to an object-shaped Result: `{ ok: true, value }` or `{ ok: false, error }`.
 */
export async function tryAsyncFn<T, E extends Error = Error>(
	input: PromiseLike<T> | (() => T | PromiseLike<T>),
): Promise<Result<Awaited<T>, E>> {
	try {
		const value = await (typeof input === "function" ? input() : input);
		return ok(value);
	} catch (e) {
		// We must cast here because TypeScript cannot guarantee the caught type is E
		return err(toError(e) as E);
	}
}

/**
 * Wraps a synchronous function call so it never throws.
 * A normal return becomes an Ok result and a thrown exception becomes an
 * Err result.
 *
 * Note: the `E` type parameter is an unchecked assertion — nothing validates
 * at runtime that the caught error actually is an `E`.
 *
 * @param fn The function to wrap.
 * @returns An object-shaped Result: `{ ok: true, value }` or `{ ok: false, error }`.
 */
export function trySyncFn<T, E extends Error = Error>(
	fn: () => T,
): Result<T, E> {
	try {
		return ok(fn());
	} catch (e) {
		// We must cast here because TypeScript cannot guarantee the caught type is E
		return err(toError(e) as E);
	}
}
