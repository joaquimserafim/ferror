import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "src/index.ts",
	format: ["cjs", "esm"],
	dts: true,
	clean: true,
	// Unminified + declaration files only; source is not shipped, so source
	// maps and declaration maps would only reference files consumers don't have.
	minify: false,
	treeshake: true,
	sourcemap: false,
});
