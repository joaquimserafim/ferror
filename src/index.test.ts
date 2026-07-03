import { describe, expect, it } from "vitest";

import { err, ok, tryAsync, trySync } from "./index";

describe("ok", () => {
	it("should create a successful result", () => {
		expect(ok("success")).toEqual({
			ok: true,
			value: "success",
			error: undefined,
		});
	});
});

describe("err", () => {
	it("should create a failed result", () => {
		const error = new Error("boom");
		expect(err(error)).toEqual({ ok: false, value: undefined, error });
	});
});

describe("tryAsync", () => {
	it("should return an Ok result if the promise resolves", async () => {
		const result = await tryAsync(Promise.resolve("success"));
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should return an Err result if the promise rejects", async () => {
		const result = await tryAsync(Promise.reject(new Error("error")));
		expect(result).toMatchObject({ ok: false, error: new Error("error") });
	});

	it("should return an Err when promise rejects with a non-Error object", async () => {
		const result = await tryAsync(Promise.reject("error"));
		expect(result).toMatchObject({
			ok: false,
			error: new Error("Unknown error: error"),
		});
	});

	it("should preserve the original thrown value on error.cause", async () => {
		const thrown = { code: 42 };
		const result = await tryAsync(Promise.reject(thrown));
		expect(result.ok).toBe(false);
		expect(result.error?.cause).toBe(thrown);
	});

	it("should handle rejection with a symbol without crashing", async () => {
		const sym = Symbol("boom");
		const result = await tryAsync(Promise.reject(sym));
		expect(result.ok).toBe(false);
		expect(result.error?.message).toBe("Unknown error: Symbol(boom)");
		expect(result.error?.cause).toBe(sym);
	});

	it("should accept a function returning a promise", async () => {
		const result = await tryAsync(() => Promise.resolve("success"));
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should capture synchronous throws from a promise-returning function", async () => {
		const result = await tryAsync((): Promise<string> => {
			throw new Error("sync boom");
		});
		expect(result).toMatchObject({
			ok: false,
			error: new Error("sync boom"),
		});
	});
});

describe("trySync", () => {
	it("should return an Ok result if the function succeeds", () => {
		const result = trySync(() => "success");
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should return an Err result if the function throws", () => {
		const result = trySync(() => {
			throw new Error("error");
		});
		expect(result).toMatchObject({ ok: false, error: new Error("error") });
	});

	it("should return an Err when function throws a non-Error object", () => {
		const result = trySync(() => {
			throw "error";
		});
		expect(result).toMatchObject({
			ok: false,
			error: new Error("Unknown error: error"),
		});
	});

	it("should preserve the original thrown value on error.cause", () => {
		const thrown = { code: 42 };
		const result = trySync(() => {
			throw thrown;
		});
		expect(result.ok).toBe(false);
		expect(result.error?.cause).toBe(thrown);
	});

	it("should handle a thrown symbol without crashing", () => {
		const sym = Symbol("boom");
		const result = trySync(() => {
			throw sym;
		});
		expect(result.ok).toBe(false);
		expect(result.error?.message).toBe("Unknown error: Symbol(boom)");
		expect(result.error?.cause).toBe(sym);
	});
});

// Regression: the wrappers must NEVER throw/reject, even when the thrown value
// itself resists coercion. `String(e)` throws for null-prototype objects and
// values with a throwing `toString`/`Symbol.toPrimitive`; `e instanceof Error`
// throws for a revoked Proxy. `toError` swallows those and falls back to a
// constant message while preserving the original value on `cause`.
const FALLBACK_MESSAGE = "Unknown error: [unrepresentable value]";

function makeHostileValues(): Array<{ name: string; value: unknown }> {
	const nullProto = Object.create(null);
	const throwingToString = {
		toString() {
			throw new Error("toString boom");
		},
	};
	const throwingToPrimitive = {
		[Symbol.toPrimitive]() {
			throw new Error("toPrimitive boom");
		},
	};
	const { proxy: revokedProxy, revoke } = Proxy.revocable({}, {});
	revoke();
	return [
		{ name: "null-prototype object", value: nullProto },
		{ name: "object with a throwing toString", value: throwingToString },
		{
			name: "object with a throwing Symbol.toPrimitive",
			value: throwingToPrimitive,
		},
		{ name: "revoked Proxy", value: revokedProxy },
	];
}

describe("never-throws contract for hostile thrown values", () => {
	for (const { name, value } of makeHostileValues()) {
		it(`trySync returns an Err (does not throw) for a thrown ${name}`, () => {
			let result: ReturnType<typeof trySync>;
			expect(() => {
				result = trySync(() => {
					throw value;
				});
			}).not.toThrow();
			// biome-ignore lint/style/noNonNullAssertion: assigned above
			const r = result!;
			expect(r.ok).toBe(false);
			expect(r.error).toBeInstanceOf(Error);
			expect(r.error?.message).toBe(FALLBACK_MESSAGE);
			expect(r.error?.cause).toBe(value);
		});

		it(`tryAsync returns an Err (does not reject) for a rejected ${name}`, async () => {
			const result = await tryAsync(Promise.reject(value));
			expect(result.ok).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error?.message).toBe(FALLBACK_MESSAGE);
			expect(result.error?.cause).toBe(value);
		});

		it(`tryAsync returns an Err for a function that throws a ${name}`, async () => {
			const result = await tryAsync(() => {
				throw value;
			});
			expect(result.ok).toBe(false);
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error?.message).toBe(FALLBACK_MESSAGE);
			expect(result.error?.cause).toBe(value);
		});
	}
});
