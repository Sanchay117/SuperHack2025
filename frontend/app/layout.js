export const metadata = { title: "The Ninjas — Dev" };

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body
                style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    padding: 16,
                }}
            >
                {children}
            </body>
        </html>
    );
}
