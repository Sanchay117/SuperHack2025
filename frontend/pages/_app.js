import "../styles/globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "../components/ErrorBoundary";

function MyApp({ Component, pageProps }) {
    return (
        <AuthProvider>
            <Toaster position="top-right" />
            <ErrorBoundary>
                <Component {...pageProps} />
            </ErrorBoundary>
        </AuthProvider>
    );
}

export default MyApp;
