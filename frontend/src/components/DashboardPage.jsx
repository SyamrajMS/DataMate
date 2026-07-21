import { useState, useEffect } from 'react';
import { Database, Plus, Sparkles, Trash2, ChevronRight } from 'lucide-react';
import { API } from '../lib/api';

export default function DashboardPage({ onConnectNew, onSelectConnection, onSelectDemo }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    setLoading(true);
    try {
      const data = await API.getConnections();
      setConnections(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this connection?")) return;
    try {
      await API.deleteConnection(id);
      await loadConnections();
    } catch (err) {
      alert("Failed to delete connection");
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Select a Database</h1>
          <p>Choose an existing connection or add a new one to start analyzing.</p>
        </div>

        <div className="dashboard-grid">
          <button className="dashboard-card demo-card" onClick={onSelectDemo}>
            <div className="card-icon"><Sparkles size={24} /></div>
            <div className="card-content">
              <h3>Northwind Demo</h3>
              <p>Try out DataMate with our built-in sample e-commerce database.</p>
            </div>
            <div className="card-arrow"><ChevronRight size={20} /></div>
          </button>

          <button className="dashboard-card new-card" onClick={onConnectNew}>
            <div className="card-icon"><Plus size={24} /></div>
            <div className="card-content">
              <h3>Connect New Database</h3>
              <p>Link your own PostgreSQL or MySQL database to analyze your data.</p>
            </div>
          </button>
        </div>

        <div className="dashboard-section">
          <h2>Your Connections</h2>
          {loading ? (
            <p className="dashboard-empty">Loading connections...</p>
          ) : connections.length > 0 ? (
            <div className="dashboard-grid connections-grid">
              {connections.map(conn => (
                <div key={conn.id} className="dashboard-card connection-card" onClick={() => onSelectConnection(conn.id)}>
                  <div className="card-icon"><Database size={20} /></div>
                  <div className="card-content">
                    <h3>{conn.connection_name}</h3>
                    <p>{conn.db_type} • {conn.host}</p>
                    <small>Last used: {new Date(conn.last_used_at + 'Z').toLocaleString()}</small>
                  </div>
                  <button 
                    className="delete-btn icon-button" 
                    onClick={(e) => handleDelete(e, conn.id)}
                    aria-label="Delete connection"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="dashboard-empty">You haven't connected any external databases yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
