import { useEffect, useState } from "react";
import { FamilySearchAuth } from "@/core/external/auth";

export function AuthStatus() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = FamilySearchAuth.getInstance();

    useEffect(() => {
        async function checkAuth() {
            try {
                const t = await auth.getAccessToken();
                setToken(t);
            } catch (e) {
                console.error("Auth check failed:", e);
            } finally {
                setLoading(false);
            }
        }
        checkAuth();
    }, []);

    const handleLogin = async () => {
        try {
            await auth.login();
        } catch (e) {
            alert("Login failed: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    const handleLogout = async () => {
        try {
            await auth.logout();
            setToken(null);
        } catch (e) {
            alert("Logout failed: " + (e instanceof Error ? e.message : String(e)));
        }
    };

    if (loading) return <div className="auth-status">Verificando sesión...</div>;

    return (
        <div className="auth-status">
            {token ? (
                <div className="auth-logged-in">
                    <span>Conectado a FamilySearch</span>
                    <button className="small danger" onClick={handleLogout}>Cerrar sesión</button>
                </div>
            ) : (
                <button className="small primary" onClick={handleLogin}>Conectar FamilySearch</button>
            )}
        </div>
    );
}
