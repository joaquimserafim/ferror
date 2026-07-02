import { describe, expect, it } from "vitest";

import { err, ok, tryAsyncFn, trySyncFn } from "./index";

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

describe("tryAsyncFn", () => {
	it("should return an Ok result if the promise resolves", async () => {
		const result = await tryAsyncFn(Promise.resolve("success"));
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should return an Err result if the promise rejects", async () => {
		const result = await tryAsyncFn(Promise.reject(new Error("error")));
		expect(result).toMatchObject({ ok: false, error: new Error("error") });
	});

	it("should return an Err when promise rejects with a non-Error object", async () => {
		const result = await tryAsyncFn(Promise.reject("error"));
		expect(result).toMatchObject({
			ok: false,
			error: new Error("Unknown error: error"),
		});
	});

	it("should preserve the original thrown value on error.cause", async () => {
		const thrown = { code: 42 };
		const result = await tryAsyncFn(Promise.reject(thrown));
		expect(result.ok).toBe(false);
		expect(result.error?.cause).toBe(thrown);
	});

	it("should handle rejection with a symbol without crashing", async () => {
		const sym = Symbol("boom");
		const result = await tryAsyncFn(Promise.reject(sym));
		expect(result.ok).toBe(false);
		expect(result.error?.message).toBe("Unknown error: Symbol(boom)");
		expect(result.error?.cause).toBe(sym);
	});

	it("should accept a function returning a promise", async () => {
		const result = await tryAsyncFn(() => Promise.resolve("success"));
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should capture synchronous throws from a promise-returning function", async () => {
		const result = await tryAsyncFn((): Promise<string> => {
			throw new Error("sync boom");
		});
		expect(result).toMatchObject({
			ok: false,
			error: new Error("sync boom"),
		});
	});
});

describe("trySyncFn", () => {
	it("should return an Ok result if the function succeeds", () => {
		const result = trySyncFn(() => "success");
		expect(result).toMatchObject({ ok: true, value: "success" });
	});

	it("should return an Err result if the function throws", () => {
		const result = trySyncFn(() => {
			throw new Error("error");
		});
		expect(result).toMatchObject({ ok: false, error: new Error("error") });
	});

	it("should return an Err when function throws a non-Error object", () => {
		const result = trySyncFn(() => {
			throw "error";
		});
		expect(result).toMatchObject({
			ok: false,
			error: new Error("Unknown error: error"),
		});
	});

	it("should preserve the original thrown value on error.cause", () => {
		const thrown = { code: 42 };
		const result = trySyncFn(() => {
			throw thrown;
		});
		expect(result.ok).toBe(false);
		expect(result.error?.cause).toBe(thrown);
	});

	it("should handle a thrown symbol without crashing", () => {
		const sym = Symbol("boom");
		const result = trySyncFn(() => {
			throw sym;
		});
		expect(result.ok).toBe(false);
		expect(result.error?.message).toBe("Unknown error: Symbol(boom)");
		expect(result.error?.cause).toBe(sym);
	});
});
