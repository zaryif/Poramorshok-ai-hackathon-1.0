import path from "path";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, ".", "");
	return {
		define: {
			"process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
			"process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
			"process.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
			"process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
				env.VITE_SUPABASE_ANON_KEY
			),
			"process.env.SUPABASE_SERVICE_ROLE_KEY": JSON.stringify(
				env.SUPABASE_SERVICE_ROLE_KEY
			),
			"process.env.VITE_GEMINI_API_KEY": JSON.stringify(
				env.VITE_GEMINI_API_KEY
			),
		},
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "."),
			},
		},
	};
});
