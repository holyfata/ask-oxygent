import { defineBuildConfig } from "obuild/config";

export default defineBuildConfig({
  entries: ["./src/index.ts"],
  clean: true,
  sourcemap: true,
});
