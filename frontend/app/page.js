import Link from "next/link";

export default function Page() {
    return (
        <main>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>
                The Ninjas — Dashboard (MVP)
            </h1>
            <p>Frontend is running. Next steps: wire auth and API.</p>
            <nav style={{ marginTop: 16 }}>
                <Link href="/login">Login</Link>
            </nav>
        </main>
    );
}
