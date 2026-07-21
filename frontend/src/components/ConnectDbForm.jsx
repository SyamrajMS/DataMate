import { useState } from 'react';
import { API } from '../lib/api';
import { ArrowLeft, ArrowRight, Database, Shield, Sparkles } from 'lucide-react';

export default function ConnectDbForm({ onCancel, onSuccess, apiModel, apiKey }) {
  const [dbType, setDbType] = useState('postgresql');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(5432);
  const [dbName, setDbName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [connectionName, setConnectionName] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!apiKey) {
      setError("Please provide an API key in the sidebar before connecting to a database (needed for schema analysis).");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const conn = await API.createConnection({
        connection_name: connectionName,
        db_type: dbType,
        host,
        port: Number(port),
        db_name: dbName,
        username,
        password,
        model: apiModel,
        api_key: apiKey
      });
      onSuccess(conn);
    } catch (err) {
      setError(err.message || 'Failed to connect');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="connect-db-page">
      <div className="connect-db-container">
        <button className="back-button" onClick={onCancel}><ArrowLeft size={16} /> Back to dashboard</button>
        <div className="connect-header">
          <div className="connect-icon"><Database size={24} /></div>
          <h2>Connect Your Database</h2>
          <p>We'll safely introspect your schema to power natural language queries.</p>
        </div>
        
        {isSubmitting ? (
          <div className="connect-analyzing">
            <div className="analyzing-orb"><Sparkles size={24} /></div>
            <h3>Analyzing Schema...</h3>
            <p>This may take up to 20 seconds. We're connecting to your database and using AI to map its structure.</p>
          </div>
        ) : (
          <form className="connect-form" onSubmit={handleSubmit}>
            {error && <div className="connect-error">{error}</div>}
            
            <label>
              <span>Connection Name</span>
              <input required type="text" value={connectionName} onChange={e => setConnectionName(e.target.value)} placeholder="e.g. Production Replica" />
            </label>
            
            <label>
              <span>Database Type</span>
              <select value={dbType} onChange={e => {
                setDbType(e.target.value);
                if (e.target.value === 'postgresql') setPort(5432);
                if (e.target.value === 'mysql') setPort(3306);
              }}>
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
              </select>
            </label>
            
            <div className="form-row">
              <label className="flex-2">
                <span>Host</span>
                <input required type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. db.example.com" />
              </label>
              <label className="flex-1">
                <span>Port</span>
                <input required type="number" value={port} onChange={e => setPort(e.target.value)} />
              </label>
            </div>
            
            <label>
              <span>Database Name</span>
              <input required type="text" value={dbName} onChange={e => setDbName(e.target.value)} placeholder="e.g. my_app_db" />
            </label>
            
            <div className="form-row">
              <label className="flex-1">
                <span>Username</span>
                <input required type="text" value={username} onChange={e => setUsername(e.target.value)} />
              </label>
              <label className="flex-1">
                <span>Password</span>
                <input required type="password" value={password} onChange={e => setPassword(e.target.value)} />
              </label>
            </div>
            
            <div className="security-notice">
              <Shield size={14} />
              <p>Your password is encrypted at rest. We only read schema metadata (tables/columns), and execute queries as Read-Only.</p>
            </div>
            
            <button type="submit" className="connect-submit">Connect & Analyze <ArrowRight size={16} /></button>
          </form>
        )}
      </div>
    </div>
  );
}
