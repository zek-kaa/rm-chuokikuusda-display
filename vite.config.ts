import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

export default defineConfig({
  vite: {
    plugins: [{
      name: "normalize-public-cloud-env-access",
      enforce: "pre",
      transform(code, id) {
        if (!id.split("?")[0]?.endsWith("/src/integrations/supabase/client.ts")) return;
        // The preview bundler replaces dot-notation VITE_* reads; normalize
        // generated bracket reads without modifying integration-managed files.
        const transformed = code.replace(
          /import\.meta\.env\[['"](VITE_SUPABASE_(?:URL|PUBLISHABLE_KEY))['"]\]/g,
          "import.meta.env.$1",
        );
        return transformed === code ? undefined : { code: transformed, map: null };
      },
    }],
    resolve: {
      alias: {
        "react-router-dom": path.resolve(__dirname, "src/lib/react-router-shim.tsx"),
      },
    },
  },
});
