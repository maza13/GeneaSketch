import React, { useState, useEffect } from 'react';
import { FamilySearchAuth } from '@/core/external/auth';
import { GedcomXMapper } from '@/core/external/gedcomxMapper';

interface Props {
    onImport: (doc: any) => void;
    onClose: () => void;
}

export const FamilySearchPanel: React.FC<Props> = ({ onImport, onClose }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const auth = FamilySearchAuth.getInstance();

    useEffect(() => {
        const checkStatus = async () => {
            const token = await auth.getAccessToken();
            setIsLoggedIn(!!token);
        };
        checkStatus();
    }, []);

    const handleLogin = async () => {
        try {
            await auth.login();
            const token = await auth.getAccessToken();
            setIsLoggedIn(!!token);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSearch = async () => {
        if (!query) return;
        setLoading(true);
        setError(null);
        try {
            const token = await auth.getAccessToken();
            if (!token) {
                setError('Debes iniciar sesión primero.');
                setIsLoggedIn(false);
                setLoading(false);
                return;
            }

            // Search endpoint for FamilySearch Tree API
            const response = await fetch(`https://api.familysearch.org/platform/tree/search?q=name:"${encodeURIComponent(query)}"`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setIsLoggedIn(false);
                    throw new Error('Sesión expirada. Por favor, vuelve a conectar.');
                }
                throw new Error('Error en la búsqueda');
            }
            const data = await response.json();
            // GedcomX entries are in data.entries
            const people = data.entries?.map((e: any) => e.content?.gedcomx?.persons?.[0]).filter(Boolean) || [];
            setResults(people);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fs-panel">
            <div className="fs-header">
                <h3>FamilySearch Connector</h3>
                <button onClick={onClose}>&times;</button>
            </div>

            {!isLoggedIn && (
                <div className="fs-auth-gate">
                    <p>Conecta tu cuenta para buscar ancestros.</p>
                    <button className="primary-button" onClick={handleLogin}>Iniciar Sesión</button>
                </div>
            )}

            {isLoggedIn && (
                <div className="fs-search-area">
                    <div className="search-input-group">
                        <input
                            type="text"
                            placeholder="Nombre del ancestro..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} disabled={loading}>
                            {loading ? 'Buscando...' : 'Buscar'}
                        </button>
                    </div>

                    <div className="fs-results">
                        {results.map((p) => (
                            <div key={p.id} className="fs-result-item">
                                <div className="info">
                                    <strong>{p.display?.name || 'Unknown'}</strong>
                                    <span>{p.display?.lifespan || ''}</span>
                                </div>
                                <button onClick={() => onImport(GedcomXMapper.toInternal({ persons: [p] }))}>
                                    Importar
                                </button>
                            </div>
                        ))}
                        {results.length === 0 && !loading && <p className="empty-state">No se encontraron resultados.</p>}
                    </div>
                </div>
            )}

            {error && <div className="fs-error">{error}</div>}

            <style>{`
        .fs-panel {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 350px;
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          color: white;
        }
        .fs-header {
          padding: 12px;
          border-bottom: 1px solid #444;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .fs-header h3 { margin: 0; font-size: 1rem; }
        .fs-header button { background: none; border: none; color: #888; font-size: 1.5rem; cursor: pointer; }
        
        .fs-auth-gate, .fs-search-area { padding: 16px; }
        .fs-auth-gate p { margin-bottom: 16px; color: #ccc; }

        .search-input-group { display: flex; gap: 8px; margin-bottom: 16px; }
        .search-input-group input { 
          flex: 1; 
          background: #1a1a1a; 
          border: 1px solid #333; 
          color: white; 
          padding: 8px; 
          border-radius: 4px;
        }
        
        .fs-results { max-height: 400px; overflow-y: auto; }
        .fs-result-item {
          padding: 10px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .fs-result-item .info { display: flex; flex-direction: column; }
        .fs-result-item span { font-size: 0.8rem; color: #888; }
        
        .primary-button {
          background: #4a9eff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
        }
        .fs-error { padding: 8px; background: rgba(255,0,0,0.1); color: #ff6666; font-size: 0.9rem; }
      `}</style>
        </div>
    );
};
