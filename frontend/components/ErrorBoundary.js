import React from "react";

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        if (process.env.NODE_ENV !== "production") {
            // eslint-disable-next-line no-console
            console.error("ErrorBoundary caught:", error, info);
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-6">
                    <div className="card max-w-lg text-center">
                        <h2 className="text-xl font-semibold mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-gray-600">
                            Please refresh the page or try again later.
                        </p>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
