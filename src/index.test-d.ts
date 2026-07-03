import { describe, expectTypeOf, it } from "vitest";

import {
	type Err,
	err,
	type Ok,
	ok,
	type Result,
	tryAsync,
	trySync,
} from "./index";

describe("Result type-level behavior", () => {
	it("narrows on the ok discriminant", () => {
		const result = trySync(() => 1);
		if (result.ok) {
			expectTypeOf(result.value).toEqualTypeOf<number>();
			expectTypeOf(result.error).toEqualTypeOf<undefined>();
		} else {
			expectTypeOf(result.error).toEqualTypeOf<Error>();
			expectTypeOf(result.value).toEqualTypeOf<undefined>();
		}
	});

	it("ok/err constructors produce the right types", () => {
		expectTypeOf(ok(1)).toEqualTypeOf<Ok<number>>();
		expectTypeOf(err(new TypeError("x"))).toEqualTypeOf<Err<TypeError>>();
	});

	it("tryAsync unwraps nested promises", () => {
		const nested = {} as Promise<Promise<number>>;
		expectTypeOf(tryAsync(nested)).resolves.toEqualTypeOf<Result<number>>();
	});

	it("tryAsync accepts a promise-returning function", () => {
		expectTypeOf(
			tryAsync(() => Promise.resolve("x")),
		).resolves.toEqualTypeOf<Result<string>>();
	});

	it("supports custom error subtypes", () => {
		class MyError extends Error {
			code = 1;
		}
		const result = trySync<number, MyError>(() => 1);
		if (!result.ok) {
			expectTypeOf(result.error).toEqualTypeOf<MyError>();
		}
	});

	it("rejects error types that do not extend Error", () => {
		// @ts-expect-error E must extend Error
		expectTypeOf<Result<number, string>>().toBeObject();
	});
});
