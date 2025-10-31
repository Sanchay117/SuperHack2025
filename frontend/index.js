import useSWR from "swr";
import axios from "axios";

const fetcher = (url) =>
    axios
        .get(url, {
            headers: {
                authorization: "Bearer " + localStorage.getItem("token"),
            },
        })
        .then((r) => r.data);

export default function Dashboard() {
    const { data: alerts } = useSWR("/api/alerts", fetcher);
    return (
        <main className="p-6">
            <h1 className="text-2xl font-bold">The Ninjas — Dashboard</h1>
            <section className="mt-4">
                <h2 className="font-semibold">Recent alerts</h2>
                <ul>
                    {alerts?.map((a) => (
                        <li key={a.id}>
                            {a.severity} — {a.summary}
                        </li>
                    )) ?? <li>Loading...</li>}
                </ul>
            </section>
        </main>
    );
}
