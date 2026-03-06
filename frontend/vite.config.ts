import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss(), basicSsl()],
	server: {
		host: true,
		proxy: {
			"/api": "http://localhost:5959",
		},
	},
});
