import axios from "axios";
import { useRouter } from "next/router";
export default function Login() {
    const router = useRouter();
    async function submit(e) {
        e.preventDefault();
        const email = e.target.email.value,
            password = e.target.password.value;
        const r = await axios.post("http://localhost:4000/api/auth/login", {
            email,
            password,
        });
        localStorage.setItem("token", r.data.token);
        router.push("/");
    }
    return (
        <form onSubmit={submit} className="p-6">
            <input name="email" placeholder="email" />
            <input name="password" placeholder="password" type="password" />
            <button type="submit">Login</button>
        </form>
    );
}
