import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: "stillmap store finder",
	description: "Server-rendered maps, cached as images.",
};

const RootLayout = ({ children }: { children: ReactNode }): ReactNode => (
	<html lang="en">
		<body>{children}</body>
	</html>
);

export default RootLayout;
